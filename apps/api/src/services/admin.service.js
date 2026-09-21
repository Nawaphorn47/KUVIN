const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sanitizeDriver } = require("./auth.service");
const { notify } = require("./notification.service");

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
    data: { paymentStatus: "PAID", disputeNote: null },
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

module.exports = {
  listPendingDrivers,
  approveDriver,
  rejectDriver,
  listTrips,
  resolveDispute,
  getStats,
};
