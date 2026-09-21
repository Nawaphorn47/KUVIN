const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sanitizeDriver, assertNumericVinNumber } = require("./auth.service");
const { isValidPromptPayId } = require("../utils/promptpay");
const queue = require("./queue.service");

async function ratingSummary(driverId) {
  const ratingAgg = await prisma.rating.aggregate({
    where: { serviceRequest: { driverId } },
    _avg: { score: true },
    _count: true,
  });
  return {
    ratingAvg: ratingAgg._avg.score ? Number(ratingAgg._avg.score.toFixed(1)) : null,
    ratingCount: ratingAgg._count,
  };
}

// โปรไฟล์เต็มของคนขับเอง (ใช้ตอน login/getMe/self-update เท่านั้น) — มีเบอร์โทร, เอกสาร, ตำแหน่งสด, fcmToken
async function getDriver(id) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw ApiError.notFound("Driver not found");

  return { ...sanitizeDriver(driver), ...(await ratingSummary(id)) };
}

// โปรไฟล์สาธารณะที่ผู้ใช้อื่นเห็นได้ (เช่น ผู้โดยสารดูโปรไฟล์คนขับ) — ไม่รวมเบอร์โทร/เอกสาร/ตำแหน่งสด/fcmToken
async function getPublicDriver(id) {
  const driver = await prisma.driver.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      photoUrl: true,
      vehicleModel: true,
      licensePlate: true,
    },
  });
  if (!driver) throw ApiError.notFound("Driver not found");

  return { ...driver, ...(await ratingSummary(id)) };
}

async function updateLocation(driverId, { lat, lng }) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw ApiError.badRequest("lat, lng ต้องเป็นตัวเลข");
  }
  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: { currentLat: lat, currentLng: lng },
  });
  return sanitizeDriver(driver);
}

async function updateAvailability(driverId, isOnline, io) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw ApiError.notFound("Driver not found");
  if (driver.verificationStatus !== "APPROVED") {
    throw ApiError.forbidden("ต้องผ่านการยืนยันตัวตนก่อนจึงจะออนไลน์รับงานได้");
  }
  // ออนไลน์ = เข้าคิวท้ายสุด, ออฟไลน์ = ออกจากคิว (ดู queue.service)
  if (isOnline) await queue.goOnline(driverId);
  else await queue.goOffline(driverId, io);
  return sanitizeDriver(await prisma.driver.findUnique({ where: { id: driverId } }));
}

// ผู้ขับส่งเอกสารยืนยันตัวตน (รวม step 1 ข้อมูลส่วนตัว+รูปถ่าย/บัตร ปชช./ใบขับขี่ + step 2 ข้อมูลรถ+รูปรถ/
// ป้ายทะเบียน) เรียกครั้งเดียวตอนกด "ส่งข้อมูลเพื่อตรวจสอบ" ท้าย step 2 — ต้องแนบรูปครบทั้ง 5 ก่อนเสมอ ไม่งั้น
// admin จะไม่มีเอกสารพอให้ตรวจสอบตัวตน (อัปโหลดรูปแต่ละใบผ่าน POST /api/uploads ก่อน แล้วค่อยส่ง url มาที่นี่)
async function submitVerification(driverId, payload) {
  const {
    vinNumber,
    licensePlate,
    vehicleModel,
    photoUrl,
    idCardPhotoUrl,
    driverLicensePhotoUrl,
    vehiclePhotoUrl,
    platePhotoUrl,
  } = payload;

  if (!photoUrl || !idCardPhotoUrl || !driverLicensePhotoUrl || !vehiclePhotoUrl || !platePhotoUrl) {
    throw ApiError.badRequest(
      "ต้องแนบรูปให้ครบ: รูปถ่ายหน้าตรง, รูปบัตรประชาชน, รูปใบขับขี่, รูปรถเต็มคัน, รูปป้ายทะเบียน"
    );
  }
  if (vinNumber) assertNumericVinNumber(vinNumber);

  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: {
      ...(vinNumber && { vinNumber }),
      ...(licensePlate && { licensePlate }),
      ...(vehicleModel && { vehicleModel }),
      photoUrl,
      idCardPhotoUrl,
      driverLicensePhotoUrl,
      vehiclePhotoUrl,
      platePhotoUrl,
      verificationStatus: "PENDING",
      rejectionReason: null,
    },
  });
  return sanitizeDriver(driver);
}

async function updateFcmToken(driverId, fcmToken) {
  const driver = await prisma.driver.update({ where: { id: driverId }, data: { fcmToken: fcmToken || null } });
  return sanitizeDriver(driver);
}

// แก้ไขข้อมูลทั่วไปที่ไม่กระทบการยืนยันตัวตน — ตอนนี้ใช้หลักสำหรับตั้ง/แก้เบอร์พร้อมเพย์รับเงินค่าโดยสาร
// (เปลี่ยน vinNumber/เอกสารต้องผ่าน submitVerification เพื่อให้กลับไปสถานะ PENDING ให้ admin ตรวจใหม่เท่านั้น)
async function updateProfile(driverId, { promptPayId }) {
  if (promptPayId !== undefined && promptPayId !== "" && !isValidPromptPayId(promptPayId)) {
    throw ApiError.badRequest("พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก");
  }

  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: {
      ...(promptPayId !== undefined && { promptPayId: promptPayId || null }),
    },
  });
  return sanitizeDriver(driver);
}

module.exports = {
  getDriver,
  getPublicDriver,
  updateLocation,
  updateAvailability,
  submitVerification,
  updateFcmToken,
  updateProfile,
};
