const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sanitizeDriver, assertNumericVinNumber } = require("./auth.service");
const { DRIVER_TYPES, DOC_LABELS } = require("../utils/driverTypes");
const fs = require("node:fs");
const privateUpload = require("../middlewares/privateUpload");
const { fileOf, toRef, signedPath } = require("../utils/privateFiles");
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
  const driver = await prisma.driver.findUnique({ where: { id }, include: { user: { select: { avatarFile: true } } } });
  if (!driver) throw ApiError.notFound("Driver not found");

  // รูปโปรไฟล์อยู่ที่บัญชีผู้ใช้เจ้าของโหมดคนขับ (ใช้รูปเดียวกันทั้งสองโหมด)
  const { user: owner, ...own } = driver;
  const avatarUrl = owner?.avatarFile ? `/uploads/avatars/${owner.avatarFile}` : null;
  return { ...sanitizeDriver(own), avatarUrl, ...(await ratingSummary(id)) };
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

  // รูปหน้าตรงให้ผู้โดยสารเทียบหน้าคนขับได้ — เป็นลิงก์เซ็นแล้วอายุสั้น ไม่ใช่ไฟล์สาธารณะ
  return { ...driver, photoUrl: signedPath(driver.photoUrl), ...(await ratingSummary(id)) };
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

// คนขับส่งเอกสารยืนยันตัวตนครั้งเดียวตอนกด "ส่งตรวจสอบ" — เอกสารที่ต้องแนบขึ้นกับประเภทคนขับ (utils/driverTypes.js)
// อัปโหลดรูปแต่ละใบผ่าน POST /api/uploads ก่อน แล้วค่อยส่ง url มาที่นี่ ส่งแล้วกลับไปรอแอดมินตรวจ (PENDING)
// เก็บเอกสารที่ส่งมาในรอบนี้ — ทุกใบต้องเป็นไฟล์ของคนขับคนนี้ที่มีอยู่จริงในโฟลเดอร์ส่วนตัว
function collectOwnDocuments(driverId, required, payload) {
  const owner = privateUpload.ownerPrefix("driver", driverId);
  const docs = {};
  for (const k of required) {
    const ref = payload[k];
    if (ref === undefined || ref === null || ref === "") continue;
    const file = fileOf(ref);
    const p = file && privateUpload.resolve(file);
    if (!p || !file.startsWith(owner) || !fs.existsSync(p)) {
      throw ApiError.badRequest(`ไฟล์${DOC_LABELS[k]}ไม่ถูกต้อง กรุณาแนบรูปใหม่`);
    }
    docs[k] = toRef(file);
  }
  return docs;
}

async function submitVerification(driverId, payload) {
  const current = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!current) throw ApiError.notFound("ไม่พบบัญชีคนขับ");
  const { vinNumber, licensePlate, vehicleModel, winGroupName } = payload;
  const required = DRIVER_TYPES[current.driverType].docs;

  // เอกสารใหม่ต้องเป็นไฟล์ที่คนขับคนนี้อัปโหลดเองผ่าน POST /drivers/me/documents เท่านั้น (รับ URL ภายนอกไม่ได้
  // กันชี้ไปรูปของคนอื่น/ลิงก์ติดตามตัวแอดมิน) — ไม่ส่งมา = ใช้ใบเดิมที่ส่งไว้แล้ว
  const docs = collectOwnDocuments(driverId, required, payload);
  const missing = required.filter((k) => !docs[k] && !current[k]);
  if (missing.length) {
    throw ApiError.badRequest(`ต้องแนบรูปให้ครบ: ${missing.map((k) => DOC_LABELS[k]).join(", ")}`);
  }
  if (vinNumber) assertNumericVinNumber(vinNumber);
  if (winGroupName !== undefined && (typeof winGroupName !== "string" || winGroupName.trim().length > 60)) {
    throw ApiError.badRequest("ชื่อวินที่สังกัดยาวได้ไม่เกิน 60 ตัวอักษร");
  }

  try {
    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        ...(vinNumber && { vinNumber }),
        ...(licensePlate && { licensePlate }),
        ...(vehicleModel && { vehicleModel }),
        ...(current.driverType === "PRO" && winGroupName && { winGroupName: winGroupName.trim() }),
        ...docs,
        verificationStatus: "PENDING",
        rejectionReason: null,
      },
    });
    return sanitizeDriver(driver);
  } catch (err) {
    if (err?.code === "P2002") throw ApiError.conflict(`เบอร์วิน ${vinNumber} มีคนขับใช้แล้วในวิทยาเขตนี้`);
    throw err;
  }
}

// อัปโหลดเอกสารคนขับหนึ่งใบเข้าโฟลเดอร์ส่วนตัว — คืน ref ไว้ส่งต่อใน submitVerification และลิงก์ดูตัวอย่าง
function documentUploaded(file) {
  if (!file) throw ApiError.badRequest("ไม่พบไฟล์ที่อัปโหลด (field name ต้องเป็น 'file')");
  const ref = toRef(file.filename);
  return { ref, url: signedPath(ref) };
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
  documentUploaded,
  updateFcmToken,
  updateProfile,
};
