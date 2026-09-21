const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { suspendedMessage } = require("../utils/accountStatus");
const { signToken } = require("../utils/jwt");
const { isValidPromptPayId } = require("../utils/promptpay");

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 นาที

function issueToken(id, role) {
  return signToken({ id, role });
}

function assertPassword(password) {
  if (!password || password.length < 8) {
    throw ApiError.badRequest("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  }
}

function assertKuEmail(email) {
  if (!email || !/^[^\s@]+@ku\.th$/i.test(email)) {
    throw ApiError.badRequest("ต้องใช้อีเมลมหาวิทยาลัยที่ลงท้ายด้วย @ku.th เท่านั้น");
  }
}

function assertThaiPhone(phone) {
  if (!phone || !/^0\d{9}$/.test(phone)) {
    throw ApiError.badRequest("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0");
  }
}

// vinNumber ต้องเป็นตัวเลขล้วน เพราะใช้กำหนดลำดับคิวรับงาน (คิวหมุนเวียนตามเบอร์วิน 1,2,3,...)
function assertNumericVinNumber(vinNumber) {
  if (!vinNumber || !/^\d+$/.test(vinNumber)) {
    throw ApiError.badRequest("เบอร์วินต้องเป็นตัวเลขล้วนเท่านั้น (ใช้กำหนดลำดับคิวรับงาน)");
  }
}

async function registerUser({ fullName, phone, email, password, studentId }) {
  if (!fullName) throw ApiError.badRequest("fullName จำเป็นต้องระบุ");
  assertThaiPhone(phone);
  assertKuEmail(email);
  assertPassword(password);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { fullName, phone, email, studentId, passwordHash },
  });

  return { user: sanitizeUser(user), token: issueToken(user.id, "user") };
}

// บอกเหตุผลที่ถูกระงับเฉพาะหลังยืนยันรหัสผ่านถูกแล้ว (ไม่เปิดเผยสถานะบัญชีให้คนที่ไม่รู้รหัสผ่าน)
function assertLoginAllowed(account) {
  if (account.isSuspended) {
    throw ApiError.forbidden(suspendedMessage(account.suspendedReason), "ACCOUNT_SUSPENDED");
  }
}

async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw ApiError.unauthorized("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
  assertLoginAllowed(user);
  return { user: sanitizeUser(user), token: issueToken(user.id, "user") };
}

// ยังไม่มี email service ต่ออยู่ — คืน resetToken ตรง ๆ ในโหมด dev เพื่อทดสอบได้ครบ flow
// เมื่อมี SMTP/mail provider จริงค่อยเปลี่ยนไปส่งอีเมลแทนการคืนค่าตรง ๆ
async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // ไม่บอกว่าอีเมลนี้มีอยู่ในระบบหรือไม่ (ป้องกัน user enumeration) — คืนผลลัพธ์เดียวกันเสมอ
  if (!user) return { message: "หากอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปแล้ว" };

  const resetToken = crypto.randomBytes(24).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  return {
    message: "หากอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปแล้ว",
    devResetToken: resetToken, // TODO: เอาออกเมื่อต่อ email service จริง
  };
}

async function resetPassword({ token, newPassword }) {
  if (!token) throw ApiError.badRequest("ต้องระบุ token");
  assertPassword(newPassword);

  const user = await prisma.user.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    throw ApiError.badRequest("ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ");
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
  });

  return { message: "เปลี่ยนรหัสผ่านสำเร็จ" };
}

async function registerDriver({ fullName, phone, password, vinNumber, licensePlate, vehicleModel, promptPayId }) {
  if (!fullName || !vinNumber || !licensePlate) {
    throw ApiError.badRequest("fullName, vinNumber, licensePlate จำเป็นต้องระบุ");
  }
  assertThaiPhone(phone);
  assertPassword(password);
  assertNumericVinNumber(vinNumber);
  if (promptPayId && !isValidPromptPayId(promptPayId)) {
    throw ApiError.badRequest("พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const driver = await prisma.driver.create({
    data: { fullName, phone, passwordHash, vinNumber, licensePlate, vehicleModel, promptPayId },
  });

  return { driver: sanitizeDriver(driver), token: issueToken(driver.id, "driver") };
}

async function loginDriver({ phone, password }) {
  const driver = await prisma.driver.findUnique({ where: { phone } });
  if (!driver || !(await bcrypt.compare(password, driver.passwordHash))) {
    throw ApiError.unauthorized("เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง");
  }
  assertLoginAllowed(driver);
  return { driver: sanitizeDriver(driver), token: issueToken(driver.id, "driver") };
}

async function loginAdmin({ email, password }) {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    throw ApiError.unauthorized("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
  return { admin: { id: admin.id, fullName: admin.fullName, email: admin.email }, token: issueToken(admin.id, "admin") };
}

async function getMe({ id, role }) {
  if (role === "user") {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound("User not found");
    return { role, ...sanitizeUser(user) };
  }
  if (role === "driver") {
    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) throw ApiError.notFound("Driver not found");
    return { role, ...sanitizeDriver(driver) };
  }
  if (role === "admin") {
    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) throw ApiError.notFound("Admin not found");
    return { role, id: admin.id, fullName: admin.fullName, email: admin.email };
  }
  throw ApiError.badRequest("Unknown role");
}

function sanitizeUser(user) {
  const { passwordHash, resetToken, resetTokenExpiresAt, ...rest } = user;
  return rest;
}

function sanitizeDriver(driver) {
  const { passwordHash, ...rest } = driver;
  return rest;
}

module.exports = {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  registerDriver,
  loginDriver,
  loginAdmin,
  getMe,
  sanitizeUser,
  sanitizeDriver,
  assertNumericVinNumber,
};
