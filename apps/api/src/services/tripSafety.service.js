// ความปลอดภัยระหว่างทริปฝั่งผู้ใช้: แชร์ทริปให้คนที่ไว้ใจ, แจ้งปัญหาหลังทริป (ดู docs/SECURITY.md)
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { signToken, verifyToken } = require("../utils/jwt");
const { signedPath } = require("../utils/privateFiles");
const { REPORT_CATEGORIES, URGENT_CATEGORIES } = require("../utils/reportCategories");
const { areaWhere, assertInScope } = require("../middlewares/adminScope");

const SHARE_TTL = "6h";
const SHARE_ACTIVE = new Set(["PENDING", "ACCEPTED", "IN_PROGRESS"]);
const REPORT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // แจ้งปัญหาได้ภายใน 7 วันหลังทริป
const REPORT_DETAIL_MAX = 1000;

const adminRooms = (areaId) => ["admin:super", `admin:area:${areaId}`];

async function loadOwnTrip(requestId, actor) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound("ไม่พบทริปนี้");
  const mine =
    (actor.role === "user" && request.userId === actor.id) || (actor.role === "driver" && request.driverId === actor.id);
  if (!mine) throw ApiError.forbidden("ไม่มีสิทธิ์เข้าถึงทริปนี้");
  return request;
}

// ---------------------------------------------------------------------------------------------
// แชร์ทริป: ลิงก์ดูได้โดยไม่ต้องล็อกอิน อายุ 6 ชม. เปิดดูตำแหน่งได้เฉพาะตอนทริปยังไม่จบ
async function createShareLink(requestId, actor) {
  const request = await loadOwnTrip(requestId, actor);
  if (actor.role !== "user") throw ApiError.forbidden("ผู้โดยสารเท่านั้นที่แชร์ทริปได้");
  if (!SHARE_ACTIVE.has(request.status)) throw ApiError.conflict("ทริปนี้จบแล้ว แชร์ไม่ได้");
  return { token: signToken({ purpose: "trip-share", rid: request.id }, { expiresIn: SHARE_TTL }) };
}

const firstName = (name) => (name ?? "").trim().split(/\s+/)[0] || null;

// ข้อมูลที่คนรับลิงก์เห็น: พอให้รู้ว่าอยู่กับใคร รถคันไหน อยู่ตรงไหน — ไม่มีเบอร์โทร ไม่มีนามสกุลผู้โดยสาร
async function publicShareView(token) {
  let rid;
  try {
    const payload = verifyToken(token);
    if (payload.purpose === "trip-share") rid = payload.rid;
  } catch {
    // ตกไปตอบว่าลิงก์ใช้ไม่ได้
  }
  if (!rid) throw ApiError.notFound("ลิงก์นี้หมดอายุหรือไม่ถูกต้อง");
  const r = await prisma.serviceRequest.findUnique({
    where: { id: rid },
    include: {
      user: { select: { fullName: true } },
      driver: {
        select: {
          fullName: true, licensePlate: true, vehicleModel: true, vinNumber: true, driverType: true,
          photoUrl: true, currentLat: true, currentLng: true, updatedAt: true,
        },
      },
      area: { select: { displayName: true } },
    },
  });
  if (!r) throw ApiError.notFound("ลิงก์นี้หมดอายุหรือไม่ถูกต้อง");
  const active = SHARE_ACTIVE.has(r.status);
  return {
    status: r.status,
    active,
    area: r.area?.displayName ?? null,
    passengerFirstName: firstName(r.user?.fullName),
    pickup: { address: r.pickupAddress, lat: r.pickupLat, lng: r.pickupLng },
    destination: { address: r.destinationAddress, lat: r.destinationLat, lng: r.destinationLng },
    requestedAt: r.requestedAt,
    acceptedAt: r.acceptedAt,
    completedAt: r.completedAt,
    driver: r.driver && {
      firstName: firstName(r.driver.fullName),
      licensePlate: r.driver.licensePlate,
      vehicleModel: r.driver.vehicleModel,
      vinNumber: r.driver.vinNumber,
      driverType: r.driver.driverType,
      photoUrl: signedPath(r.driver.photoUrl),
      // ตำแหน่งสดเฉพาะตอนทริปยังไม่จบ — จบแล้วไม่บอกว่าคนขับอยู่ไหนต่อ
      location: active && r.driver.currentLat != null ? { lat: r.driver.currentLat, lng: r.driver.currentLng, at: r.driver.updatedAt } : null,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// แจ้งปัญหาหลังทริป
async function createReport(requestId, actor, { category, detail }, io) {
  const request = await loadOwnTrip(requestId, actor);
  const categories = REPORT_CATEGORIES[actor.role];
  if (!categories || !Object.hasOwn(categories, category)) {
    throw ApiError.badRequest("กรุณาเลือกหัวข้อปัญหา");
  }
  if (!request.driverId) throw ApiError.conflict("ทริปนี้ยังไม่มีคนขับ แจ้งปัญหาไม่ได้");
  const endedAt = request.completedAt ?? request.cancelledAt ?? request.acceptedAt ?? request.requestedAt;
  if (Date.now() - new Date(endedAt).getTime() > REPORT_WINDOW_MS) {
    throw ApiError.conflict("แจ้งปัญหาได้ภายใน 7 วันหลังทริป กรณีเร่งด่วนติดต่อแอดมินวิทยาเขตโดยตรง");
  }
  const text = typeof detail === "string" ? detail.trim() : "";
  if (text.length > REPORT_DETAIL_MAX) throw ApiError.badRequest(`รายละเอียดยาวได้ไม่เกิน ${REPORT_DETAIL_MAX} ตัวอักษร`);
  if (category === "OTHER" && !text) throw ApiError.badRequest("เลือก \"อื่น ๆ\" ต้องเล่ารายละเอียดด้วย");

  const open = await prisma.tripReport.findFirst({
    where: { serviceRequestId: requestId, reporterRole: actor.role, reporterId: actor.id, status: "OPEN" },
  });
  if (open) throw ApiError.conflict("คุณแจ้งปัญหาทริปนี้ไว้แล้ว แอดมินกำลังตรวจสอบ");

  const report = await prisma.tripReport.create({
    data: {
      serviceRequestId: requestId,
      areaId: request.areaId,
      reporterRole: actor.role,
      reporterId: actor.id,
      category,
      detail: text || null,
    },
  });
  io?.to(adminRooms(request.areaId)).emit("report:new", await withContext(report));
  return report;
}

async function withContext(report) {
  const trip = await prisma.serviceRequest.findUnique({
    where: { id: report.serviceRequestId },
    select: {
      pickupAddress: true, destinationAddress: true, requestedAt: true, fare: true,
      user: { select: { id: true, fullName: true, phone: true } },
      driver: { select: { id: true, fullName: true, phone: true, vinNumber: true, licensePlate: true } },
    },
  });
  const labels = REPORT_CATEGORIES[report.reporterRole] ?? {};
  return { ...report, categoryLabel: labels[report.category] ?? report.category, urgent: URGENT_CATEGORIES.has(report.category), trip };
}

async function listReports(scope, { status } = {}) {
  const reports = await prisma.tripReport.findMany({
    where: { ...areaWhere(scope), ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Promise.all(reports.map(withContext));
}

async function resolveReport(scope, id, note) {
  const report = await prisma.tripReport.findUnique({ where: { id } });
  if (!report) throw ApiError.notFound("ไม่พบรายการแจ้งปัญหานี้");
  assertInScope(scope, report.areaId, "ไม่พบรายการแจ้งปัญหานี้");
  if (report.status === "RESOLVED") throw ApiError.conflict("รายการนี้ปิดไปแล้ว");
  const text = typeof note === "string" ? note.trim().slice(0, 500) : "";
  const updated = await prisma.tripReport.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date(), resolvedNote: text || null },
  });
  return withContext(updated);
}

module.exports = {
  createShareLink,
  publicShareView,
  createReport,
  listReports,
  resolveReport,
};
