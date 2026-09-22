const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sanitizeDriver } = require("./auth.service");
const { notify } = require("./notification.service");
const queue = require("./queue.service");
const { sanitizeUser } = require("./auth.service");
const { invalidateAccountStatus } = require("../utils/accountStatus");

async function listPendingDrivers() {
  const drivers = await prisma.driver.findMany({
    where: { verificationStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  return drivers.map(sanitizeDriver);
}

async function approveDriver(driverId, io) {
  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: { verificationStatus: "APPROVED", rejectionReason: null },
  });

  await notify(io, {
    recipientType: "DRIVER",
    recipientId: driverId,
    title: "ยืนยันตัวตนสำเร็จ",
    body: "บัญชีคนขับของคุณผ่านการตรวจสอบแล้ว สามารถเริ่มรับงานได้ทันที",
  });

  return sanitizeDriver(driver);
}

async function rejectDriver(driverId, reason, io) {
  if (!reason) throw ApiError.badRequest("ต้องระบุเหตุผลที่ปฏิเสธ");

  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: { verificationStatus: "REJECTED", rejectionReason: reason },
  });

  await notify(io, {
    recipientType: "DRIVER",
    recipientId: driverId,
    title: "ข้อมูลไม่ผ่านการตรวจสอบ",
    body: reason,
  });

  return sanitizeDriver(driver);
}

async function listTrips({ status } = {}) {
  return prisma.serviceRequest.findMany({
    where: status ? { status } : {},
    include: {
      user: { select: { fullName: true } },
      driver: { select: { fullName: true } },
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });
}

async function resolveDispute(requestId) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound("ไม่พบคำขอนี้");
  if (request.paymentStatus !== "DISPUTED") {
    throw ApiError.conflict("คำขอนี้ไม่ได้อยู่ในสถานะข้อพิพาท");
  }

  return prisma.serviceRequest.update({
    where: { id: requestId },
    data: { paymentStatus: "PAID", disputeNote: null, paymentConfirmedBy: "ADMIN" },
  });
}

async function getStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    tripsToday,
    revenueTodayAgg,
    onlineDrivers,
    approvedDrivers,
    pendingDrivers,
    disputedPayments,
  ] = await Promise.all([
    prisma.serviceRequest.count({ where: { status: "COMPLETED", completedAt: { gte: startOfToday } } }),
    prisma.serviceRequest.aggregate({
      where: { status: "COMPLETED", completedAt: { gte: startOfToday } },
      _sum: { fare: true },
    }),
    prisma.driver.count({ where: { isOnline: true, verificationStatus: "APPROVED" } }),
    prisma.driver.count({ where: { verificationStatus: "APPROVED" } }),
    prisma.driver.count({ where: { verificationStatus: "PENDING" } }),
    prisma.serviceRequest.count({ where: { paymentStatus: "DISPUTED" } }),
  ]);

  return {
    tripsToday,
    revenueToday: revenueTodayAgg._sum.fare ?? 0,
    onlineDrivers,
    approvedDrivers,
    pendingDrivers,
    disputedPayments,
  };
}

// ---------------------------------------------------------------------------
// จัดการผู้ใช้/คนขับ: ค้นหา, ดูรายละเอียดพร้อมสถิติ/ประวัติ, ระงับ/ปลดระงับบัญชี
// ---------------------------------------------------------------------------
const LIST_LIMIT = 200;

const searchWhere = (q, fields) =>
  q ? { OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) } : {};

// จำนวนทริปทั้งหมด/สำเร็จ ของแต่ละคนในรายการ (2 query รวม ไม่ใช่ query ต่อแถว)
async function tripCounts(field, ids) {
  if (ids.length === 0) return { total: new Map(), completed: new Map() };
  const [all, done] = await Promise.all([
    prisma.serviceRequest.groupBy({ by: [field], where: { [field]: { in: ids } }, _count: { _all: true } }),
    prisma.serviceRequest.groupBy({
      by: [field],
      where: { [field]: { in: ids }, status: "COMPLETED" },
      _count: { _all: true },
    }),
  ]);
  return {
    total: new Map(all.map((r) => [r[field], r._count._all])),
    completed: new Map(done.map((r) => [r[field], r._count._all])),
  };
}

async function listUsers({ q, status } = {}) {
  const users = await prisma.user.findMany({
    where: {
      ...searchWhere(q, ["fullName", "phone", "email", "studentId"]),
      ...(status === "suspended" ? { isSuspended: true } : status === "active" ? { isSuspended: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
  });
  const counts = await tripCounts("userId", users.map((u) => u.id));
  return users.map((u) => ({
    ...sanitizeUser(u),
    tripCount: counts.total.get(u.id) ?? 0,
    completedTripCount: counts.completed.get(u.id) ?? 0,
  }));
}

async function listDrivers({ q, status } = {}) {
  const statusWhere =
    status === "suspended"
      ? { isSuspended: true }
      : status === "online"
        ? { isOnline: true }
        : ["PENDING", "APPROVED", "REJECTED"].includes(status)
          ? { verificationStatus: status }
          : {};
  const drivers = await prisma.driver.findMany({
    where: { ...searchWhere(q, ["fullName", "phone", "vinNumber", "licensePlate"]), ...statusWhere },
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
  });
  const counts = await tripCounts("driverId", drivers.map((d) => d.id));
  return drivers.map((d) => ({
    ...sanitizeDriver(d),
    tripCount: counts.total.get(d.id) ?? 0,
    completedTripCount: counts.completed.get(d.id) ?? 0,
  }));
}

const tripInclude = {
  user: { select: { id: true, fullName: true } },
  driver: { select: { id: true, fullName: true, vinNumber: true } },
};

// สถิติของทริปที่เกี่ยวข้องกับบัญชีนี้ (field = "userId" | "driverId")
async function tripStats(field, id) {
  const [byStatus, revenue, disputed] = await Promise.all([
    prisma.serviceRequest.groupBy({ by: ["status"], where: { [field]: id }, _count: { _all: true } }),
    prisma.serviceRequest.aggregate({ where: { [field]: id, status: "COMPLETED" }, _sum: { fare: true } }),
    prisma.serviceRequest.count({ where: { [field]: id, paymentStatus: "DISPUTED" } }),
  ]);
  const count = (status) => byStatus.find((r) => r.status === status)?._count._all ?? 0;
  return {
    totalTrips: byStatus.reduce((n, r) => n + r._count._all, 0),
    completedTrips: count("COMPLETED"),
    cancelledTrips: count("CANCELLED"),
    runningTrips: count("ACCEPTED") + count("IN_PROGRESS"), // ทริปที่วิ่งอยู่จริง (กันการระงับ) — PENDING ไม่นับ
    totalFare: revenue._sum.fare ?? 0,
    disputedPayments: disputed,
  };
}

async function getUserDetail(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound("ไม่พบผู้ใช้นี้");

  const [stats, ratingAgg, trips] = await Promise.all([
    tripStats("userId", id),
    // คะแนนที่คนขับให้ผู้โดยสารคนนี้
    prisma.driverRating.aggregate({ where: { serviceRequest: { userId: id } }, _avg: { score: true }, _count: true }),
    prisma.serviceRequest.findMany({ where: { userId: id }, include: tripInclude, orderBy: { requestedAt: "desc" }, take: 20 }),
  ]);
  return {
    profile: sanitizeUser(user),
    stats: { ...stats, ratingAvg: ratingAgg._avg.score ? Number(ratingAgg._avg.score.toFixed(1)) : null, ratingCount: ratingAgg._count },
    trips,
  };
}

async function getDriverDetail(id) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw ApiError.notFound("ไม่พบคนขับนี้");

  const [stats, ratingAgg, trips] = await Promise.all([
    tripStats("driverId", id),
    // คะแนนที่ผู้โดยสารให้คนขับคนนี้
    prisma.rating.aggregate({ where: { serviceRequest: { driverId: id } }, _avg: { score: true }, _count: true }),
    prisma.serviceRequest.findMany({ where: { driverId: id }, include: tripInclude, orderBy: { requestedAt: "desc" }, take: 20 }),
  ]);
  return {
    profile: sanitizeDriver(driver),
    stats: { ...stats, ratingAvg: ratingAgg._avg.score ? Number(ratingAgg._avg.score.toFixed(1)) : null, ratingCount: ratingAgg._count },
    trips,
  };
}

// ตัด socket ของบัญชีนี้ทันที (client ที่ต่ออยู่จะได้ event ก่อนแล้วค่อยถูกตัด)
async function kickSockets(io, role, id, reason) {
  if (!io) return;
  io.to(`${role}:${id}`).emit("account:suspended", { reason });
  for (const socket of await io.fetchSockets()) {
    if (socket.auth?.role === role && socket.auth?.id === id) socket.disconnect(true);
  }
}

// ระงับบัญชี — ไม่ระงับระหว่างที่มีทริปวิ่งอยู่ (ผู้โดยสารหรือคนขับอีกฝั่งจะค้างกลางทาง) ให้รอทริปจบก่อน
// ผู้ใช้ที่มีคำขอ PENDING (ยังหาคนขับอยู่) จะถูกยกเลิกคำขอให้อัตโนมัติ
async function suspendAccount(role, id, reason, io) {
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (!trimmed) throw ApiError.badRequest("ต้องระบุเหตุผลที่ระงับบัญชี");

  const field = role === "user" ? "userId" : "driverId";
  const model = role === "user" ? prisma.user : prisma.driver;
  const account = await model.findUnique({ where: { id } });
  if (!account) throw ApiError.notFound("ไม่พบบัญชีนี้");
  if (account.isSuspended) throw ApiError.conflict("บัญชีนี้ถูกระงับอยู่แล้ว");

  const running = await prisma.serviceRequest.count({
    where: { [field]: id, status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
  });
  if (running > 0) throw ApiError.conflict("บัญชีนี้มีทริปที่กำลังดำเนินการอยู่ กรุณารอให้ทริปเสร็จสิ้นก่อนระงับ");

  await model.update({ where: { id }, data: { isSuspended: true, suspendedReason: trimmed, suspendedAt: new Date() } });
  invalidateAccountStatus(role, id);

  if (role === "user") {
    await prisma.serviceRequest.updateMany({
      where: { userId: id, status: "PENDING" },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "บัญชีผู้โดยสารถูกระงับ", offeredDriverId: null, offerExpiresAt: null },
    });
  } else {
    await queue.goOffline(id, io); // ออกจากคิว + ส่งต่อข้อเสนองานที่ค้างอยู่ให้คนถัดไป
  }

  await kickSockets(io, role, id, trimmed);
  const fresh = await model.findUnique({ where: { id } });
  return role === "user" ? sanitizeUser(fresh) : sanitizeDriver(fresh);
}

async function unsuspendAccount(role, id) {
  const model = role === "user" ? prisma.user : prisma.driver;
  const account = await model.findUnique({ where: { id } });
  if (!account) throw ApiError.notFound("ไม่พบบัญชีนี้");
  if (!account.isSuspended) throw ApiError.conflict("บัญชีนี้ไม่ได้ถูกระงับ");

  const fresh = await model.update({ where: { id }, data: { isSuspended: false, suspendedReason: null, suspendedAt: null } });
  invalidateAccountStatus(role, id);
  return role === "user" ? sanitizeUser(fresh) : sanitizeDriver(fresh);
}

module.exports = {
  listUsers,
  listDrivers,
  getUserDetail,
  getDriverDetail,
  suspendAccount,
  unsuspendAccount,
  listPendingDrivers,
  approveDriver,
  rejectDriver,
  listTrips,
  resolveDispute,
  getStats,
};
