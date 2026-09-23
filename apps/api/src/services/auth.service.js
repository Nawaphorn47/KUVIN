const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { suspendedMessage } = require("../utils/accountStatus");
const { signToken } = require("../utils/jwt");
const { isValidPromptPayId } = require("../utils/promptpay");
const mail = require("./mail.service");

const SALT_ROUNDS = 10;
const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 นาที
// รหัส 6 หลักมีแค่ 1,000,000 แบบ — จำกัดครั้งที่กรอกผิดต่อรหัส (นอกเหนือจาก rate limit ต่อ IP) ไม่งั้นสุ่มเดาได้
const RESET_CODE_MAX_ATTEMPTS = 5;
const INVALID_RESET_CODE = "รหัสยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่";

function issueToken(id, role) {
  return signToken({ id, role });
}

function assertPassword(password) {
  if (!password || password.length < 8) {
    throw ApiError.badRequest("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  }
}

// อีเมลไหนก็สมัครได้ (ไม่จำกัดแค่ @ku.th แล้ว — ผู้มาติดต่อ/บุคลากรบางส่วนไม่มีอีเมลมหาวิทยาลัย)
// เก็บและค้นหาด้วยตัวพิมพ์เล็กเสมอ ไม่งั้น "A@gmail.com" กับ "a@gmail.com" กลายเป็นสองบัญชี/ล็อกอินไม่เจอ
function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function assertEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw ApiError.badRequest("รูปแบบอีเมลไม่ถูกต้อง");
  }
}

// บัญชีเก่าที่สมัครไว้ก่อนเริ่มเก็บเป็นตัวพิมพ์เล็กอาจมีตัวพิมพ์ใหญ่ปน — ค้นแบบไม่สนตัวพิมพ์
function findUserByEmail(email) {
  return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
}

function hashResetCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
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

async function registerUser({ fullName, phone, email: rawEmail, password, studentId }) {
  if (!fullName) throw ApiError.badRequest("fullName จำเป็นต้องระบุ");
  const email = normalizeEmail(rawEmail);
  assertThaiPhone(phone);
  assertEmail(email);
  assertPassword(password);
  if (await findUserByEmail(email)) throw ApiError.conflict("อีเมลนี้ถูกใช้สมัครไปแล้ว");

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
  const user = await findUserByEmail(normalizeEmail(email));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw ApiError.unauthorized("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
  assertLoginAllowed(user);
  return { user: sanitizeUser(user), token: issueToken(user.id, "user") };
}

// โชว์รหัสใน response แทนการส่งอีเมล — เฉพาะตอน dev ที่ตั้ง DEV_SHOW_RESET_CODE=1 เองเท่านั้น
// (เดิมคืน token ใน response ทุกครั้งไม่ว่า environment ไหน = ใครรู้อีเมลคนอื่นก็ยึดบัญชีได้ทันที)
function devShowsResetCode() {
  return process.env.DEV_SHOW_RESET_CODE === "1" && process.env.NODE_ENV !== "production";
}

async function requestPasswordReset(rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!email) throw ApiError.badRequest("กรุณากรอกอีเมล");

  const showCode = devShowsResetCode();
  if (!mail.isConfigured() && !showCode) {
    throw new ApiError(503, "ระบบส่งอีเมลยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ", "MAIL_NOT_CONFIGURED");
  }

  // ไม่บอกว่าอีเมลนี้มีอยู่ในระบบหรือไม่ (ป้องกัน user enumeration) — คืนข้อความเดียวกันเสมอ
  const message = "หากอีเมลนี้อยู่ในระบบ เราได้ส่งรหัสยืนยัน 6 หลักไปแล้ว (หมดอายุใน 15 นาที)";
  const user = await findUserByEmail(email);
  if (!user) return { message };

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashResetCode(code),
      resetTokenExpiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
      resetAttempts: 0,
    },
  });

  if (mail.isConfigured()) {
    try {
      await mail.sendMail({
        to: user.email,
        subject: `KU VIN — รหัสรีเซ็ตรหัสผ่าน ${code}`,
        text:
          `รหัสยืนยันสำหรับตั้งรหัสผ่านใหม่ของคุณคือ ${code}\n\n` +
          "รหัสนี้หมดอายุใน 15 นาที หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ",
      });
    } catch (err) {
      console.error("[mail] ส่งรหัสรีเซ็ตรหัสผ่านไม่สำเร็จ:", err.message);
      throw new ApiError(502, "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "MAIL_SEND_FAILED");
    }
  }

  return showCode ? { message, devResetCode: code } : { message };
}

async function resetPassword({ email: rawEmail, code, newPassword }) {
  assertPassword(newPassword); // ตรวจก่อน ไม่ให้รหัสผ่านใหม่ที่สั้นเกินไปมาเผาโควตาการกรอกรหัสยืนยัน
  const email = normalizeEmail(rawEmail);
  if (!email || !/^\d{6}$/.test(code ?? "")) throw ApiError.badRequest(INVALID_RESET_CODE);

  const user = await findUserByEmail(email);
  if (!user || !user.resetToken || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    throw ApiError.badRequest(INVALID_RESET_CODE);
  }

  // หักโควตาก่อนเทียบรหัส แบบ atomic (เงื่อนไข lt ใน updateMany) — ยิงพร้อมกันหลาย request ก็เดาเกินโควตาไม่ได้
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, resetToken: user.resetToken, resetAttempts: { lt: RESET_CODE_MAX_ATTEMPTS } },
    data: { resetAttempts: { increment: 1 } },
  });
  const matches = crypto.timingSafeEqual(Buffer.from(hashResetCode(code)), Buffer.from(user.resetToken));
  if (count === 0 || !matches) {
    throw ApiError.badRequest(count === 0 ? "กรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่" : INVALID_RESET_CODE);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null, resetAttempts: 0 },
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
  // เหมือนฝั่งผู้ใช้: ไม่สนตัวพิมพ์เล็ก/ใหญ่และช่องว่าง (เดิมพิมพ์ตัวแรกเป็นตัวใหญ่ = ล็อกอินไม่ได้ทั้งที่รหัสถูก)
  const admin = await prisma.admin.findFirst({
    where: { email: { equals: normalizeEmail(email), mode: "insensitive" } },
  });
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
  const { passwordHash, resetToken, resetTokenExpiresAt, resetAttempts, ...rest } = user;
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
