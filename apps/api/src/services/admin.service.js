// งานของแอดมิน — ทุกฟังก์ชันรับ scope (req.adminScope) ข้อมูลนอกพื้นที่ของแอดมินพื้นที่จะตอบว่า "ไม่พบ"
// ผู้โดยสารไม่ได้สังกัดพื้นที่ (บัญชีเดียวใช้ได้ทุกที่) แอดมินพื้นที่จึงเห็นเฉพาะผู้โดยสารที่เคยใช้บริการในพื้นที่ตัวเอง
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sanitizeDriver, sanitizeUser } = require("./auth.service");
const { notify } = require("./notification.service");
const queue = require("./queue.service");
const { invalidateAccountStatus } = require("../utils/accountStatus");
const { areaWhere, assertInScope } = require("../middlewares/adminScope");

const areaLabel = { area: { select: { id: true, displayName: true } } };

async function findDriverInScope(scope, driverId) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw ApiError.notFound("ไม่พบคนขับนี้");
  assertInScope(scope, driver.areaId, "ไม่พบคนขับนี้");
  return driver;
}

// ผู้โดยสารอยู่ในขอบเขตของแอดมินพื้นที่ = เคยมีคำขอในพื้นที่นั้น
const userInScopeWhere = (scope) => (scope.areaId ? { requests: { some: { areaId: scope.areaId } } } : {});

async function findUserInScope(scope, userId) {
  const user = await prisma.user.findFirst({ where: { id: userId, ...userInScopeWhere(scope) } });
  if (!user) throw ApiError.notFound("ไม่พบผู้ใช้นี้");
  return user;
}

async function listPendingDrivers(scope) {
  const drivers = await prisma.driver.findMany({
    where: { ...areaWhere(scope), verificationStatus: "PENDING" },
    include: areaLabel,
    orderBy: { createdAt: "asc" },
  });
  return drivers.map(sanitizeDriver);
}

async function approveDriver(scope, driverId, io) {
  await findDriverInScope(scope, driverId);
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

async function rejectDriver(scope, driverId, reason, io) {
  if (!reason) throw ApiError.badRequest("ต้องระบุเหตุผลที่ปฏิเสธ");
  await findDriverInScope(scope, driverId);

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

async function listTrips(scope, { status } = {}) {
  return prisma.serviceRequest.findMany({
    where: { ...areaWhere(scope), ...(status ? { status } : {}) },
    include: {
      user: { select: { fullName: true } },
      driver: { select: { fullName: true } },
      ...areaLabel,
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });
}

async function resolveDispute(scope, requestId) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound("ไม่พบคำขอนี้");
  assertInScope(scope, request.areaId, "ไม่พบคำขอนี้");
  if (request.paymentStatus !== "DISPUTED") {
    throw ApiError.conflict("คำขอนี้ไม่ได้อยู่ในสถานะข้อพิพาท");
  }

  return prisma.serviceRequest.update({
    where: { id: requestId },
    data: { paymentStatus: "PAID", disputeNote: null, paymentConfirmedBy: "ADMIN" },
  });
}

async function getStats(scope) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const area = areaWhere(scope);

  const [
    tripsToday,
    revenueTodayAgg,
    onlineDrivers,
    approvedDrivers,
    pendingDrivers,
    disputedPayments,
  ] = await Promise.all([
    prisma.serviceRequest.count({ where: { ...area, status: "COMPLETED", completedAt: { gte: startOfToday } } }),
    prisma.serviceRequest.aggregate({
      where: { ...area, status: "COMPLETED", completedAt: { gte: startOfToday } },
      _sum: { fare: true },
    }),
    prisma.driver.count({ where: { ...area, isOnline: true, verificationStatus: "APPROVED" } }),
    prisma.driver.count({ where: { ...area, verificationStatus: "APPROVED" } }),
    prisma.driver.count({ where: { ...area, verificationStatus: "PENDING" } }),
    prisma.serviceRequest.count({ where: { ...area, paymentStatus: "DISPUTED" } }),
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

// จำนวนทริปทั้งหมด/สำเร็จ ของแต่ละคนในรายการ (2 query รวม ไม่ใช่ query ต่อแถว) — นับเฉพาะทริปในขอบเขต
async function tripCounts(scope, field, ids) {
  if (ids.length === 0) return { total: new Map(), completed: new Map() };
  const base = { ...areaWhere(scope), [field]: { in: ids } };
  const [all, done] = await Promise.all([
    prisma.serviceRequest.groupBy({ by: [field], where: base, _count: { _all: true } }),
    prisma.serviceRequest.groupBy({ by: [field], where: { ...base, status: "COMPLETED" }, _count: { _all: true } }),
  ]);
  return {
    total: new Map(all.map((r) => [r[field], r._count._all])),
    completed: new Map(done.map((r) => [r[field], r._count._all])),
  };
}

async function listUsers(scope, { q, status } = {}) {
  const users = await prisma.user.findMany({
    where: {
      ...userInScopeWhere(scope),
      ...searchWhere(q, ["fullName", "phone", "email", "studentId"]),
      ...(status === "suspended" ? { isSuspended: true } : status === "active" ? { isSuspended: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
  });
  const counts = await tripCounts(scope, "userId", users.map((u) => u.id));
  return users.map((u) => ({
    ...sanitizeUser(u),
    tripCount: counts.total.get(u.id) ?? 0,
    completedTripCount: counts.completed.get(u.id) ?? 0,
  }));
}

async function listDrivers(scope, { q, status } = {}) {
  const statusWhere =
    status === "suspended"
      ? { isSuspended: true }
      : status === "online"
        ? { isOnline: true }
        : ["PENDING", "APPROVED", "REJECTED"].includes(status)
          ? { verificationStatus: status }
          : {};
  const drivers = await prisma.driver.findMany({
    where: { ...areaWhere(scope), ...searchWhere(q, ["fullName", "phone", "vinNumber", "licensePlate"]), ...statusWhere },
    include: areaLabel,
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
  });
  const counts = await tripCounts(scope, "driverId", drivers.map((d) => d.id));
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

// สถิติของทริปที่เกี่ยวข้องกับบัญชีนี้ (field = "userId" | "driverId") ในขอบเขตของแอดมิน
async function tripStats(scope, field, id) {
  const where = { ...areaWhere(scope), [field]: id };
  const [byStatus, revenue, disputed] = await Promise.all([
    prisma.serviceRequest.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.serviceRequest.aggregate({ where: { ...where, status: "COMPLETED" }, _sum: { fare: true } }),
    prisma.serviceRequest.count({ where: { ...where, paymentStatus: "DISPUTED" } }),
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

async function getUserDetail(scope, id) {
  const user = await findUserInScope(scope, id);

  const [stats, ratingAgg, trips] = await Promise.all([
    tripStats(scope, "userId", id),
    // คะแนนที่คนขับให้ผู้โดยสารคนนี้
    prisma.driverRating.aggregate({
      where: { serviceRequest: { userId: id, ...areaWhere(scope) } },
      _avg: { score: true },
      _count: true,
    }),
    prisma.serviceRequest.findMany({
      where: { userId: id, ...areaWhere(scope) },
      include: tripInclude,
      orderBy: { requestedAt: "desc" },
      take: 20,
    }),
  ]);
  return {
    profile: sanitizeUser(user),
    stats: { ...stats, ratingAvg: ratingAgg._avg.score ? Number(ratingAgg._avg.score.toFixed(1)) : null, ratingCount: ratingAgg._count },
    trips,
  };
}

async function getDriverDetail(scope, id) {
  const driver = await findDriverInScope(scope, id);

  const [stats, ratingAgg, trips, area] = await Promise.all([
    tripStats(scope, "driverId", id),
    // คะแนนที่ผู้โดยสารให้คนขับคนนี้
    prisma.rating.aggregate({ where: { serviceRequest: { driverId: id } }, _avg: { score: true }, _count: true }),
    prisma.serviceRequest.findMany({ where: { driverId: id }, include: tripInclude, orderBy: { requestedAt: "desc" }, take: 20 }),
    prisma.area.findUnique({ where: { id: driver.areaId }, select: { id: true, displayName: true } }),
  ]);
  return {
    profile: { ...sanitizeDriver(driver), area },
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
// การระงับผู้โดยสารมีผลทุกพื้นที่ (บัญชีเดียว) — แอดมินพื้นที่ระงับได้เฉพาะคนที่เคยใช้บริการในพื้นที่ตัวเอง
async function suspendAccount(scope, role, id, reason, io) {
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (!trimmed) throw ApiError.badRequest("ต้องระบุเหตุผลที่ระงับบัญชี");

  const field = role === "user" ? "userId" : "driverId";
  const model = role === "user" ? prisma.user : prisma.driver;
  const account = role === "user" ? await findUserInScope(scope, id) : await findDriverInScope(scope, id);
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

async function unsuspendAccount(scope, role, id) {
  const model = role === "user" ? prisma.user : prisma.driver;
  const account = role === "user" ? await findUserInScope(scope, id) : await findDriverInScope(scope, id);
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
