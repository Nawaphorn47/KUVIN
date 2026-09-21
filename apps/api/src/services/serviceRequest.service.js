const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { calculateFare } = require("../utils/geo");
const { getRoute } = require("../utils/routing");
const { notify } = require("./notification.service");
const { generatePaymentQr } = require("../utils/promptpay");

const queue = require("./queue.service");

const { includeParties } = queue;

async function resolvePoint({ landmarkId, lat, lng, address }) {
  if (landmarkId) {
    const landmark = await prisma.landmark.findUnique({ where: { id: landmarkId } });
    if (!landmark) throw ApiError.badRequest("ไม่พบสถานที่ที่เลือก");
    return { lat: landmark.lat, lng: landmark.lng, address: address ?? landmark.name };
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw ApiError.badRequest("ต้องระบุ landmarkId หรือพิกัด lat/lng");
  }
  return { lat, lng, address: address ?? null };
}

const ACTIVE_STATUSES = ["PENDING", "ACCEPTED", "IN_PROGRESS"];

// พรีวิวระยะทาง/ค่าโดยสารก่อนกดยืนยันจริง (ไม่เขียนลง DB)
async function estimateFare(payload) {
  const pickup = await resolvePoint({
    landmarkId: payload.pickupLandmarkId,
    lat: payload.pickupLat,
    lng: payload.pickupLng,
  });
  const destination = await resolvePoint({
    landmarkId: payload.destinationLandmarkId,
    lat: payload.destinationLat,
    lng: payload.destinationLng,
  });

  const route = await getRoute(pickup, destination);
  const fareInfo = calculateFare({ pickup, destination, routeDistanceKm: route.distanceKm });
  return {
    isWithinCampus: fareInfo.isWithinCampus,
    distanceKm: Number(fareInfo.distanceKm.toFixed(2)),
    fare: fareInfo.fare,
    pickup: { lat: pickup.lat, lng: pickup.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    route: { source: route.source, durationMin: Math.round(route.durationMin), coordinates: route.coordinates },
  };
}

async function createRequest(userId, payload, io) {
  const activeCount = await prisma.serviceRequest.count({
    where: { userId, status: { in: ACTIVE_STATUSES } },
  });
  if (activeCount > 0) {
    throw ApiError.conflict("คุณมีคำขอที่ยังดำเนินการอยู่ กรุณายกเลิกหรือรอให้เสร็จสิ้นก่อน");
  }

  const pickup = await resolvePoint({
    landmarkId: payload.pickupLandmarkId,
    lat: payload.pickupLat,
    lng: payload.pickupLng,
    address: payload.pickupAddress,
  });
  const destination = await resolvePoint({
    landmarkId: payload.destinationLandmarkId,
    lat: payload.destinationLat,
    lng: payload.destinationLng,
    address: payload.destinationAddress,
  });

  // ค่าโดยสารนอกมหาวิทยาลัยคิดจากระยะทางตามถนนจริง (fallback เป็นเส้นตรงถ้าบริการแผนที่ไม่ตอบ)
  const route = await getRoute(pickup, destination);
  const fareInfo = calculateFare({ pickup, destination, routeDistanceKm: route.distanceKm });

  const request = await prisma.serviceRequest.create({
    data: {
      userId,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupAddress: pickup.address,
      destinationLat: destination.lat,
      destinationLng: destination.lng,
      destinationAddress: destination.address,
      isWithinCampus: fareInfo.isWithinCampus,
      distanceKm: Number(fareInfo.distanceKm.toFixed(2)),
      fare: fareInfo.fare,
    },
    include: includeParties,
  });

  // dispatchRequest อาจยกเลิกคำขอนี้ไปเลยแบบ synchronous ถ้าไม่มีคนขับว่างในคิวเลย
  // ต้อง return ค่าที่ได้จากมันแทน `request` เดิม ไม่งั้น response จะบอกว่ายัง PENDING อยู่ทั้งที่จริงถูกยกเลิกไปแล้ว
  // (ฝั่ง client เอา response นี้ไป join socket room ทีหลัง เลยพลาด event ที่ emit ไปก่อนหน้าไม่ทันเห็น)
  return (await queue.dispatchRequest(request.id, io)) ?? request;
}

// คนขับกดรับ/ปฏิเสธงานที่ "ถึงคิวตัวเอง" — logic ทั้งหมด (ล็อกแถว, ย้ายคิว, ส่งต่อคนถัดไป) อยู่ที่ queue.service
async function assertRequestExists(requestId) {
  const existing = await prisma.serviceRequest.findUnique({ where: { id: requestId }, select: { id: true } });
  if (!existing) throw ApiError.notFound("ไม่พบคำขอนี้");
}

async function acceptRequest(requestId, driverId, io) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { verificationStatus: true } });
  if (!driver) throw ApiError.notFound("Driver not found");
  if (driver.verificationStatus !== "APPROVED") {
    throw ApiError.forbidden("บัญชียังไม่ผ่านการยืนยันตัวตน");
  }
  await assertRequestExists(requestId);
  return queue.handleDriverResponse(driverId, "accept", io, { requestId });
}

async function declineOffer(requestId, driverId, io) {
  await assertRequestExists(requestId);
  return queue.handleDriverResponse(driverId, "reject", io, { requestId });
}

async function transition(requestId, driverId, { from, to, extraData = {} }) {
  const existing = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw ApiError.notFound("ไม่พบคำขอนี้");
  if (existing.driverId !== driverId) throw ApiError.forbidden("ไม่ใช่งานของคุณ");
  if (existing.status !== from) {
    throw ApiError.conflict(`สถานะปัจจุบันคือ ${existing.status} ไม่สามารถเปลี่ยนเป็น ${to} ได้`);
  }

  return prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: to, ...extraData },
    include: includeParties,
  });
}

async function startRequest(requestId, driverId, io) {
  const request = await transition(requestId, driverId, { from: "ACCEPTED", to: "IN_PROGRESS" });
  io?.to(`service-request:${requestId}`).emit("service-request:status", request);
  return request;
}

async function completeRequest(requestId, driverId, io) {
  const request = await transition(requestId, driverId, {
    from: "IN_PROGRESS",
    to: "COMPLETED",
    extraData: { completedAt: new Date() },
  });

  await queue.handleTripCompleted(driverId);

  io?.to(`service-request:${requestId}`).emit("service-request:status", request);
  await notify(io, {
    recipientType: "USER",
    recipientId: request.userId,
    title: "เดินทางเสร็จสิ้น",
    body: `คุณเดินทางจาก ${request.pickupAddress ?? "-"} ถึง ${request.destinationAddress ?? "-"} เรียบร้อยแล้ว`,
  });

  return request;
}

async function cancelRequest(requestId, actor, io, reason) {
  const existing = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw ApiError.notFound("ไม่พบคำขอนี้");

  const isOwner = actor.role === "user" && existing.userId === actor.id;
  const isAssignedDriver = actor.role === "driver" && existing.driverId === actor.id;
  if (!isOwner && !isAssignedDriver) throw ApiError.forbidden("ไม่มีสิทธิ์ยกเลิกคำขอนี้");

  if (!["PENDING", "ACCEPTED"].includes(existing.status)) {
    throw ApiError.conflict("ไม่สามารถยกเลิกคำขอที่เริ่มเดินทางแล้ว");
  }

  // updateMany แบบมีเงื่อนไขสถานะเดิม: ถ้าระหว่างนั้นคนขับกดรับ (PENDING→ACCEPTED) หรือสถานะเปลี่ยนไปแล้ว จะไม่เขียนทับ
  const cancelled = await prisma.serviceRequest.updateMany({
    where: { id: requestId, status: existing.status },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason ?? (isOwner ? "ผู้โดยสารยกเลิก" : "คนขับยกเลิก"),
      offeredDriverId: null,
      offerExpiresAt: null,
    },
  });
  if (cancelled.count === 0) throw ApiError.conflict("สถานะคำขอเปลี่ยนไปแล้ว กรุณาลองใหม่อีกครั้ง");

  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId }, include: includeParties });

  // งานที่รับไปแล้วถูกยกเลิก: คนขับว่างอีกครั้ง (ยังออนไลน์ → กลับเข้าท้ายคิว)
  if (existing.driverId) await queue.handleTripCompleted(existing.driverId);

  io?.to(`service-request:${requestId}`).emit("service-request:status", request);
  return request;
}

async function setPaymentStatus(requestId, driverId, { status, disputeNote }) {
  if (!["PAID", "DISPUTED"].includes(status)) {
    throw ApiError.badRequest("status ต้องเป็น PAID หรือ DISPUTED");
  }

  const existing = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw ApiError.notFound("ไม่พบคำขอนี้");
  if (existing.driverId !== driverId) throw ApiError.forbidden("ไม่ใช่งานของคุณ");
  if (existing.status !== "COMPLETED") {
    throw ApiError.conflict("บันทึกสถานะการชำระเงินได้เฉพาะทริปที่เสร็จสิ้นแล้ว");
  }

  return prisma.serviceRequest.update({
    where: { id: requestId },
    data: { paymentStatus: status, disputeNote: status === "DISPUTED" ? disputeNote ?? null : null },
  });
}

// สร้าง QR พร้อมเพย์ให้ผู้โดยสารสแกนจ่ายค่าโดยสารตรงให้คนขับคนนั้น ยอดเงินตรงตาม fare ของทริปนี้เป๊ะ ๆ
// (ไม่ใช่ payment gateway จริง — แค่ QR มาตรฐานพร้อมเพย์ที่ธนาคารไหนก็สแกนจ่ายได้ คนขับยังต้องกดยืนยันว่าได้รับเงิน
// แล้วเองผ่าน setPaymentStatus เหมือนเดิม ไม่มีการตรวจสอบอัตโนมัติว่าโอนจริงหรือยัง)
async function getPaymentQr(requestId, actor) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: { driver: { select: { id: true, promptPayId: true } } },
  });
  if (!request) throw ApiError.notFound("ไม่พบคำขอนี้");

  const allowed =
    (actor.role === "user" && request.userId === actor.id) ||
    (actor.role === "driver" && request.driverId === actor.id);
  if (!allowed) throw ApiError.forbidden("ไม่มีสิทธิ์เข้าถึงคำขอนี้");

  if (!request.driver) throw ApiError.conflict("ทริปนี้ยังไม่มีคนขับรับงาน");
  if (!request.driver.promptPayId) {
    throw ApiError.conflict("คนขับยังไม่ได้ตั้งค่าพร้อมเพย์ไว้รับเงิน กรุณาชำระเงินสดแทน");
  }
  if (!request.fare) throw ApiError.conflict("ทริปนี้ยังไม่มีค่าโดยสารให้ชำระ");

  const { payload, qrDataUrl } = await generatePaymentQr(request.driver.promptPayId, request.fare);
  return { payload, qrDataUrl, amount: request.fare };
}

async function rateRequest(requestId, userId, { score, comment }) {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw ApiError.badRequest("score ต้องเป็นจำนวนเต็ม 1-5");
  }

  const existing = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw ApiError.notFound("ไม่พบคำขอนี้");
  if (existing.userId !== userId) throw ApiError.forbidden("ไม่มีสิทธิ์ให้คะแนนทริปนี้");
  if (existing.status !== "COMPLETED") throw ApiError.conflict("ให้คะแนนได้เฉพาะทริปที่เสร็จสิ้นแล้ว");

  return prisma.rating.create({
    data: { serviceRequestId: requestId, ratedByUserId: userId, score, comment },
  });
}

// คนขับให้คะแนนผู้โดยสาร — ฝั่งตรงข้ามของ rateRequest เพื่อความรับผิดชอบร่วมกันทั้งสองฝ่าย
async function ratePassenger(requestId, driverId, { score, comment }) {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw ApiError.badRequest("score ต้องเป็นจำนวนเต็ม 1-5");
  }

  const existing = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw ApiError.notFound("ไม่พบคำขอนี้");
  if (existing.driverId !== driverId) throw ApiError.forbidden("ไม่มีสิทธิ์ให้คะแนนทริปนี้");
  if (existing.status !== "COMPLETED") throw ApiError.conflict("ให้คะแนนได้เฉพาะทริปที่เสร็จสิ้นแล้ว");

  return prisma.driverRating.create({
    data: { serviceRequestId: requestId, ratedByDriverId: driverId, score, comment },
  });
}

async function getById(requestId, actor) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: { ...includeParties, rating: true, driverRating: true },
  });
  if (!request) throw ApiError.notFound("ไม่พบคำขอนี้");

  const allowed =
    actor.role === "admin" ||
    (actor.role === "user" && request.userId === actor.id) ||
    (actor.role === "driver" && request.driverId === actor.id);
  if (!allowed) throw ApiError.forbidden("ไม่มีสิทธิ์เข้าถึงคำขอนี้");

  return request;
}

async function listForUser(userId, { status } = {}) {
  return prisma.serviceRequest.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: includeParties,
    orderBy: { requestedAt: "desc" },
  });
}

async function listForDriver(driverId, { status } = {}) {
  return prisma.serviceRequest.findMany({
    where: { driverId, ...(status ? { status } : {}) },
    include: includeParties,
    orderBy: { requestedAt: "desc" },
  });
}

// polling fallback (นอกเหนือจาก push ผ่าน socket) — ใช้ดูภาพรวมคิวทั้งหมดเฉย ๆ, "isMyTurn" บอกว่าอันไหน
// ถึงตาตัวเองแล้วจริง ๆ (กดรับ/ปฏิเสธได้) ส่วนอันอื่นแค่รอดูสถานะ ยังกดรับไม่ได้จนกว่าจะถึงคิว
async function listPending(driverId) {
  const requests = await prisma.serviceRequest.findMany({
    where: { status: "PENDING" },
    include: includeParties,
    orderBy: { requestedAt: "asc" },
  });

  if (!driverId) return requests;

  return requests.map((r) => ({ ...r, isMyTurn: r.offeredDriverId === driverId }));
}

module.exports = {
  estimateFare,
  createRequest,
  acceptRequest,
  declineOffer,
  getQueueOverview: queue.getQueueOverview,
  startRequest,
  completeRequest,
  cancelRequest,
  sweepExpiredOffers: queue.sweepExpiredOffers,
  setPaymentStatus,
  getPaymentQr,
  rateRequest,
  ratePassenger,
  getById,
  listForUser,
  listForDriver,
  listPending,
};
