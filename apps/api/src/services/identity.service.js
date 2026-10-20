// ตัวตนแบบบัญชีเดียว: เข้าระบบด้วย OTP เบอร์โทร / Google, สลับโหมดผู้โดยสาร ↔ คนขับ, สมัครขับจากบัญชีผู้ใช้
// และยืนยันตัวตนผู้โดยสาร (เบอร์ผ่าน OTP + เซลฟี่) ก่อนเรียกวินครั้งแรก
//
// token ยังแยก role เหมือนเดิม ({ id, role: "user" | "driver" }) — สิทธิ์ทุก endpoint เดิมจึงไม่ต้องแก้
// การ "สลับโหมด" คือออก token ของอีกบทบาทให้บัญชีที่ผูกกันไว้ (Driver.userId)
const crypto = require("node:crypto");
const fs = require("node:fs");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { suspendedMessage } = require("../utils/accountStatus");
const { signToken, verifyToken } = require("../utils/jwt");
const { isValidPromptPayId } = require("../utils/promptpay");
const { sanitizeUser, sanitizeDriver, assertNumericVinNumber } = require("./auth.service");
const privateUpload = require("../middlewares/privateUpload");
const { isDriverType } = require("../utils/driverTypes");

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5; // ผิดได้กี่ครั้งต่อรหัสหนึ่งชุด
const OTP_SENDS_PER_HOUR = 5; // ขอรหัสได้กี่ครั้งต่อเบอร์ต่อชั่วโมง (กันยิง SMS จนเสียเงิน/รบกวนเจ้าของเบอร์)
const OTP_FAILS_BEFORE_LOCK = 10; // ผิดรวมทุกรหัสกี่ครั้งถึงล็อกเบอร์ (กันขอรหัสใหม่วนเดาไปเรื่อย ๆ)
const OTP_LOCK_MS = 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const TICKET_TTL = "15m";
const INVALID_OTP = "รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่";

const issueToken = (id, role) => signToken({ id, role });

function assertThaiPhone(phone) {
  if (typeof phone !== "string" || !/^0\d{9}$/.test(phone)) {
    throw ApiError.badRequest("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0");
  }
}

function assertActive(account) {
  if (account.isSuspended) {
    throw ApiError.forbidden(suspendedMessage(account.suspendedReason), "ACCOUNT_SUSPENDED");
  }
}

// ---------------------------------------------------------------------------------------------
// OTP
// OTP_MODE: "sms" = ส่งจริง (ยังไม่ได้ต่อผู้ให้บริการ) | "test" = คืนรหัสใน response ให้แอปโชว์แทน SMS
// ไม่ตั้ง = test ตอน dev, ปิดตอน production — production ที่ยังไม่ซื้อ SMS ต้องตั้ง OTP_MODE=test เองโดยรู้ว่า
// ใครก็ขอรหัสของเบอร์ไหนก็ได้ (ใช้กับเดโม/ทดสอบเท่านั้น)
function otpMode() {
  const mode = process.env.OTP_MODE;
  if (mode === "sms" || mode === "test") return mode;
  return process.env.NODE_ENV === "production" ? "off" : "test";
}

const hashCode = (phone, code) => crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");

async function sendSms(_phone, _message) {
  // ยังไม่ได้เลือกผู้ให้บริการ SMS — ต่อของจริงตรงนี้ (เช่น ThaiBulkSMS) แล้วตั้ง OTP_MODE=sms
  throw new ApiError(503, "ระบบส่ง SMS ยังไม่เปิดใช้งาน");
}

// โหมดทดสอบบนเซิร์ฟเวอร์จริง (production) = ใครก็เห็นรหัส → อนุญาตเฉพาะเบอร์ใน OTP_TEST_PHONES (คั่นด้วย ,)
// ต้องการเปิดให้ทุกเบอร์จริง ๆ (เดโมสาธารณะ ยอมรับความเสี่ยง) ต้องตั้ง OTP_TEST_PHONES=* เอง
function assertTestPhoneAllowed(phone) {
  if (process.env.NODE_ENV !== "production") return;
  const list = new Set((process.env.OTP_TEST_PHONES ?? "").split(",").map((p) => p.trim()).filter(Boolean));
  if (list.has("*")) return;
  if (!list.has(phone)) {
    throw ApiError.forbidden("เบอร์นี้ยังไม่เปิดให้ทดสอบ OTP (ระบบยังไม่ส่ง SMS จริง)", "OTP_TEST_PHONE_ONLY");
  }
}

function assertNotLocked(record) {
  if (record?.lockedUntil && record.lockedUntil > new Date()) {
    const mins = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    throw new ApiError(429, `กรอกรหัสผิดหลายครั้งเกินไป เบอร์นี้ถูกพักไว้ อีก ${mins} นาทีลองใหม่ได้`, "OTP_LOCKED");
  }
}

async function requestOtp(phone) {
  assertThaiPhone(phone);
  const mode = otpMode();
  if (mode === "off") throw new ApiError(503, "การเข้าสู่ระบบด้วย OTP ยังไม่เปิดใช้งาน", "OTP_DISABLED");
  if (mode === "test") assertTestPhoneAllowed(phone);

  const existing = await prisma.phoneOtp.findUnique({ where: { phone } });
  assertNotLocked(existing);
  const windowExpired = !existing || Date.now() - existing.windowStart.getTime() > HOUR_MS;
  if (!windowExpired && existing.sendCount >= OTP_SENDS_PER_HOUR) {
    throw new ApiError(429, `ขอรหัสครบ ${OTP_SENDS_PER_HOUR} ครั้งในชั่วโมงนี้แล้ว ลองใหม่ภายหลัง`, "OTP_SEND_LIMIT");
  }
  if (existing && Date.now() - existing.sentAt.getTime() < OTP_RESEND_MS) {
    const wait = Math.ceil((OTP_RESEND_MS - (Date.now() - existing.sentAt.getTime())) / 1000);
    throw new ApiError(429, `ขอรหัสใหม่ได้อีกครั้งใน ${wait} วินาที`, "OTP_COOLDOWN");
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const data = {
    codeHash: hashCode(phone, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
    sentAt: new Date(),
    ...(windowExpired ? { windowStart: new Date(), sendCount: 1 } : { sendCount: existing.sendCount + 1 }),
  };
  await prisma.phoneOtp.upsert({ where: { phone }, create: { phone, ...data }, update: data });

  if (mode === "sms") await sendSms(phone, `รหัส KU VIN ของคุณคือ ${code} (ใช้ได้ 5 นาที)`);
  return {
    sent: true,
    expiresInSec: OTP_TTL_MS / 1000,
    resendInSec: OTP_RESEND_MS / 1000,
    testMode: mode === "test",
    ...(mode === "test" && { testCode: code }),
  };
}

// ใช้รหัสได้ครั้งเดียว กรอกผิดครบโควตาแล้วรหัสนั้นตาย (นอกเหนือจาก rate limit ต่อ IP)
async function consumeOtp(phone, code) {
  assertThaiPhone(phone);
  const record = await prisma.phoneOtp.findUnique({ where: { phone } });
  assertNotLocked(record);
  if (!record || record.expiresAt < new Date() || record.attempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.badRequest(INVALID_OTP);
  }
  const given = Buffer.from(hashCode(phone, String(code ?? "")));
  const expected = Buffer.from(record.codeHash);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    const failCount = record.failCount + 1;
    await prisma.phoneOtp.update({
      where: { phone },
      data: {
        attempts: { increment: 1 },
        failCount,
        ...(failCount >= OTP_FAILS_BEFORE_LOCK && { lockedUntil: new Date(Date.now() + OTP_LOCK_MS) }),
      },
    });
    throw ApiError.badRequest(INVALID_OTP);
  }
  await prisma.phoneOtp.delete({ where: { phone } });
}

function readTicket(ticket, purpose) {
  try {
    const payload = verifyToken(ticket);
    if (payload.purpose === purpose) return payload;
  } catch {
    // ตกลงไปโยน error ด้านล่าง
  }
  throw ApiError.badRequest("ขั้นตอนนี้หมดเวลาแล้ว กรุณาเริ่มใหม่อีกครั้ง");
}

// ผูก Google เข้ากับบัญชี (ถ้ามีตั๋ว Google ค้างมาจากขั้นก่อนหน้า และยังไม่ถูกผูกกับบัญชีอื่น)
async function googleLinkData(googleTicket, user) {
  if (!googleTicket) return {};
  const g = readTicket(googleTicket, "google-signup");
  if (user?.googleSub) return {};
  if (await prisma.user.findUnique({ where: { googleSub: g.sub } })) return {};
  const emailFree = g.email && !(await prisma.user.findFirst({ where: { email: { equals: g.email, mode: "insensitive" } } }));
  return { googleSub: g.sub, ...(emailFree && !user?.email && { email: g.email }) };
}

// ยืนยัน OTP เพื่อเข้าระบบ — เบอร์ที่มีบัญชีแล้วเข้าได้ทันที, เบอร์ใหม่ได้ตั๋วไปกรอกชื่อ (completeSignup)
async function verifyOtp({ phone, code, googleTicket }) {
  await consumeOtp(phone, code);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return { needsName: true, ticket: signToken({ purpose: "otp-signup", phone }, { expiresIn: TICKET_TTL }) };
  }
  assertActive(user);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(), ...(await googleLinkData(googleTicket, user)) },
  });
  return { user: sanitizeUser(updated), token: issueToken(updated.id, "user") };
}

async function completeSignup({ ticket, fullName, googleTicket }) {
  const { phone } = readTicket(ticket, "otp-signup");
  const name = typeof fullName === "string" ? fullName.trim() : "";
  if (name.length < 2 || name.length > 80) throw ApiError.badRequest("กรุณากรอกชื่อ-นามสกุล (2–80 ตัวอักษร)");
  if (await prisma.user.findUnique({ where: { phone } })) throw ApiError.conflict("เบอร์นี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ");

  const user = await prisma.user.create({
    data: { fullName: name, phone, phoneVerifiedAt: new Date(), ...(await googleLinkData(googleTicket, null)) },
  });
  return { user: sanitizeUser(user), token: issueToken(user.id, "user") };
}

// ผู้ใช้ที่ล็อกอินอยู่แล้ว (เช่น บัญชีอีเมลเดิม) ยืนยันเบอร์ของตัวเองด้วย OTP
async function verifyMyPhone(userId, { code }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("ไม่พบบัญชีผู้ใช้");
  await consumeOtp(user.phone, code);
  const updated = await prisma.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } });
  return sanitizeUser(updated);
}

// ---------------------------------------------------------------------------------------------
// Google — ตรวจ ID token กับ Google แล้วเทียบ aud กับ GOOGLE_CLIENT_ID ของเรา (ไม่ตั้ง = ปิดฟีเจอร์นี้)
async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new ApiError(503, "การเข้าสู่ระบบด้วย Google ยังไม่เปิดใช้งาน", "GOOGLE_DISABLED");
  if (typeof credential !== "string" || credential.length > 4096) throw ApiError.badRequest("ข้อมูลจาก Google ไม่ถูกต้อง");

  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const info = res.ok ? await res.json() : null;
  const validIssuer = info && ["accounts.google.com", "https://accounts.google.com"].includes(info.iss);
  if (!info || info.aud !== clientId || !validIssuer || Number(info.exp) * 1000 < Date.now()) {
    throw ApiError.unauthorized("ยืนยันบัญชี Google ไม่สำเร็จ กรุณาลองใหม่");
  }
  return {
    sub: info.sub,
    email: info.email_verified === "true" || info.email_verified === true ? String(info.email).toLowerCase() : null,
    name: info.name ?? null,
  };
}

// Google ที่ผูกแล้ว/อีเมลตรงกับบัญชีเดิม = เข้าได้เลย; บัญชีใหม่ต้องยืนยันเบอร์โทรต่อ (ทุกบัญชีต้องมีเบอร์ที่ติดต่อได้)
async function googleLogin({ credential }) {
  const g = await verifyGoogleCredential(credential);
  let user = await prisma.user.findUnique({ where: { googleSub: g.sub } });
  if (!user && g.email) {
    const byEmail = await prisma.user.findFirst({ where: { email: { equals: g.email, mode: "insensitive" } } });
    if (byEmail && !byEmail.googleSub) user = await prisma.user.update({ where: { id: byEmail.id }, data: { googleSub: g.sub } });
  }
  if (user) {
    assertActive(user);
    return { user: sanitizeUser(user), token: issueToken(user.id, "user") };
  }
  return {
    needsPhone: true,
    name: g.name,
    googleTicket: signToken({ purpose: "google-signup", sub: g.sub, email: g.email }, { expiresIn: TICKET_TTL }),
  };
}

// ---------------------------------------------------------------------------------------------
// สลับโหมด
async function switchToDriver(userId) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new ApiError(404, "บัญชีนี้ยังไม่ได้สมัครขับ", "NO_DRIVER_MODE");
  assertActive(driver);
  return { driver: sanitizeDriver(driver), token: issueToken(driver.id, "driver") };
}

// บัญชีคนขับแบบเก่า (สมัครแยก ไม่มีบัญชีผู้โดยสาร) — สร้างบัญชีผู้โดยสารจากเบอร์เดียวกันให้เลย
// ถ้าเบอร์นี้มีบัญชีผู้โดยสารอยู่แล้วจะไม่ผูกให้เอง (ยังไม่ได้พิสูจน์ว่าเป็นเจ้าของเดียวกัน) ให้เข้าบัญชีนั้นด้วย OTP แล้วกดสมัครขับ
async function switchToUser(driverId) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: { user: true } });
  if (!driver) throw ApiError.notFound("ไม่พบบัญชีคนขับ");
  let user = driver.user;
  if (!user) {
    if (await prisma.user.findUnique({ where: { phone: driver.phone } })) {
      throw ApiError.conflict(
        "เบอร์นี้มีบัญชีผู้โดยสารอยู่แล้ว ออกจากระบบแล้วเข้าด้วย OTP เบอร์นี้ จากนั้นกด 'สมัครขับ' เพื่อรวมเป็นบัญชีเดียว",
        "USER_EXISTS_UNLINKED"
      );
    }
    user = await prisma.user.create({ data: { fullName: driver.fullName, phone: driver.phone, driver: { connect: { id: driver.id } } } });
  }
  assertActive(user);
  return { user: sanitizeUser(user), token: issueToken(user.id, "user") };
}

// เบอร์วินไม่บังคับแล้ว (ใครก็สมัครขับได้) — ไม่กรอก = ได้เลขถัดไปของพื้นที่ ใช้เป็นเลขประจำตัวในคิว
async function nextVinNumber(areaId) {
  const rows = await prisma.driver.findMany({ where: { areaId }, select: { vinNumber: true } });
  const max = rows.reduce((m, r) => Math.max(m, Number.parseInt(r.vinNumber, 10) || 0), 0);
  return String(max + 1);
}

// ข้อมูลเฉพาะประเภท: นิสิตต้องมีรหัสนิสิต, วินมอเตอร์ไซค์ต้องมีเบอร์เสื้อวินและชื่อวินที่สังกัด
function typeFields({ driverType, studentId, winGroupName, vinNumber }) {
  if (!isDriverType(driverType)) throw ApiError.badRequest("กรุณาเลือกประเภทคนขับ: นิสิต บุคคลทั่วไป หรือวินมอเตอร์ไซค์");
  const out = { driverType, studentId: null, winGroupName: null };
  if (driverType === "STUDENT") {
    const id = typeof studentId === "string" ? studentId.trim() : "";
    if (!/^\d{5,15}$/.test(id)) throw ApiError.badRequest("กรุณากรอกรหัสนิสิตเป็นตัวเลข");
    out.studentId = id;
  }
  if (driverType === "PRO") {
    const group = typeof winGroupName === "string" ? winGroupName.trim() : "";
    if (!group || group.length > 60) throw ApiError.badRequest("กรุณากรอกชื่อวินที่สังกัด (ไม่เกิน 60 ตัวอักษร)");
    if (!vinNumber) throw ApiError.badRequest("วินมอเตอร์ไซค์ต้องกรอกเบอร์เสื้อวิน");
    out.winGroupName = group;
  }
  return out;
}

// ตรวจข้อมูลใบสมัครคนขับ (ป้ายทะเบียน พร้อมเพย์ พื้นที่ เบอร์วิน) — คืนป้ายทะเบียนที่ตัดช่องว่างแล้ว
async function validateApplication({ licensePlate, promptPayId, areaId, vinNumber }) {
  const plate = typeof licensePlate === "string" ? licensePlate.trim() : "";
  if (!plate || plate.length > 40) throw ApiError.badRequest("กรุณากรอกป้ายทะเบียนรถ");
  if (promptPayId && !isValidPromptPayId(promptPayId)) {
    throw ApiError.badRequest("พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก");
  }
  if (!areaId) throw ApiError.badRequest("กรุณาเลือกพื้นที่ที่จะรับงาน");
  const area = await prisma.area.findFirst({ where: { id: areaId, isActive: true }, select: { id: true } });
  if (!area) throw ApiError.badRequest("ไม่พบพื้นที่ที่เลือก หรือพื้นที่นี้ปิดให้บริการแล้ว");
  if (vinNumber) assertNumericVinNumber(vinNumber);
  return plate;
}

async function becomeDriver(userId, { areaId, vinNumber, licensePlate, vehicleModel, promptPayId, driverType, studentId, winGroupName }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { driver: true } });
  if (!user) throw ApiError.notFound("ไม่พบบัญชีผู้ใช้");
  assertActive(user);
  if (user.driver) return switchToDriver(userId);
  if (!user.phoneVerifiedAt) throw ApiError.forbidden("กรุณายืนยันเบอร์โทรด้วย OTP ก่อนสมัครขับ", "PHONE_NOT_VERIFIED");

  // คนขับแบบเก่าที่ใช้เบอร์เดียวกัน — เบอร์ผ่าน OTP แล้ว = พิสูจน์ความเป็นเจ้าของ ผูกเข้าบัญชีนี้ได้
  const legacy = await prisma.driver.findUnique({ where: { phone: user.phone } });
  if (legacy) {
    if (legacy.userId) throw ApiError.conflict("เบอร์นี้ผูกกับบัญชีอื่นไปแล้ว");
    const linked = await prisma.driver.update({ where: { id: legacy.id }, data: { userId } }); // ประเภทเดิม (PRO) คงไว้
    return { driver: sanitizeDriver(linked), token: issueToken(linked.id, "driver"), linked: true };
  }

  const plate = await validateApplication({ licensePlate, promptPayId, areaId, vinNumber });
  const typed = typeFields({ driverType, studentId, winGroupName, vinNumber });

  try {
    const driver = await prisma.driver.create({
      data: {
        userId,
        ...typed,
        fullName: user.fullName,
        phone: user.phone,
        areaId,
        vinNumber: vinNumber || (await nextVinNumber(areaId)),
        licensePlate: plate,
        vehicleModel: vehicleModel || null,
        promptPayId: promptPayId || null,
      },
    });
    return { driver: sanitizeDriver(driver), token: issueToken(driver.id, "driver") };
  } catch (err) {
    if (err?.code === "P2002" && String(err.meta?.target ?? "").includes("vinNumber")) {
      throw ApiError.conflict(`เบอร์วิน ${vinNumber} มีคนขับใช้แล้วในพื้นที่นี้ เว้นว่างให้ระบบตั้งให้ได้`);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------------------------
// เซลฟี่ยืนยันตัวตนผู้โดยสาร (เห็นเฉพาะแอดมิน)
function removePrivateFile(fileName) {
  const p = privateUpload.resolve(fileName);
  if (p) fs.promises.unlink(p).catch(() => {});
}

async function saveSelfie(userId, file) {
  if (!file) throw ApiError.badRequest("กรุณาถ่ายรูปเซลฟี่ (field name ต้องเป็น 'file')");
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { selfieFile: true } });
  const user = await prisma.user.update({ where: { id: userId }, data: { selfieFile: file.filename, selfieAt: new Date() } });
  if (before?.selfieFile) removePrivateFile(before.selfieFile);
  return sanitizeUser(user);
}

async function selfiePath(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { selfieFile: true } });
  const p = user && privateUpload.resolve(user.selfieFile);
  if (!p || !fs.existsSync(p)) throw ApiError.notFound("ผู้ใช้นี้ยังไม่มีรูปยืนยันตัวตน");
  return p;
}

// ผู้โดยสารต้องยืนยันเบอร์ + มีเซลฟี่ก่อนเรียกวิน — PASSENGER_VERIFICATION=off ปิดได้ (เช่น ตอนเดโม/ทดสอบ)
function assertPassengerVerified(user) {
  if (process.env.PASSENGER_VERIFICATION === "off") return;
  if (!user.phoneVerifiedAt) {
    throw ApiError.forbidden("ยืนยันเบอร์โทรด้วย OTP ก่อนเรียกวินครั้งแรก", "PHONE_NOT_VERIFIED");
  }
  if (!user.selfieFile) {
    throw ApiError.forbidden("ถ่ายเซลฟี่ยืนยันตัวตนก่อนเรียกวินครั้งแรก", "SELFIE_REQUIRED");
  }
}

module.exports = {
  otpMode,
  requestOtp,
  verifyOtp,
  completeSignup,
  verifyMyPhone,
  googleLogin,
  switchToDriver,
  switchToUser,
  becomeDriver,
  saveSelfie,
  selfiePath,
  assertPassengerVerified,
};
