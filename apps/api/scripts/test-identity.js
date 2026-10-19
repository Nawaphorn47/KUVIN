// ทดสอบบัญชีเดียว: OTP เบอร์โทร (โหมดทดสอบ), สมัครด้วย OTP, สลับโหมดผู้โดยสาร ↔ คนขับ, สมัครขับจากบัญชีผู้ใช้,
// ผูกบัญชีคนขับแบบเก่า และด่านยืนยันตัวตนก่อนเรียกวิน — รัน: npm run test:identity
// เรียก service ตรง ๆ (ไม่ผ่าน HTTP) ไม่ต้องเปิด API ต้องมีแค่ DB; ข้อมูลทดสอบใช้เบอร์ prefix 0996 แล้วลบทิ้งตอนจบ
require("dotenv").config();
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const auth = require("../src/services/auth.service");
const identity = require("../src/services/identity.service");
const { verifyToken } = require("../src/utils/jwt");

const stamp = String(Date.now()).slice(-5);
const phone = (n) => `0996${stamp}${n}`;
let passed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n`, err);
    process.exitCode = 1;
  }
}

async function expectReject(promise, pattern) {
  await assert.rejects(promise, (err) => {
    assert.match(`${err.code ?? ""} ${err.message}`, pattern);
    return true;
  });
}

// ขอรหัสแล้วข้ามช่วงกันขอถี่ (ย้อน sentAt) ให้เคสถัดไปขอใหม่ได้ทันที
async function freshCode(p) {
  await prisma.phoneOtp.updateMany({ where: { phone: p }, data: { sentAt: new Date(0) } });
  const res = await identity.requestOtp(p);
  return res.testCode;
}

async function main() {
  process.env.OTP_MODE = "test";
  delete process.env.PASSENGER_VERIFICATION;
  const area = await prisma.area.findFirst({ where: { isActive: true } });
  assert.ok(area, "ต้องมีพื้นที่ที่เปิดใช้งานอย่างน้อย 1 พื้นที่ (รัน seed ก่อน)");

  console.log("OTP");
  await test("โหมดทดสอบคืนรหัส 6 หลัก และขอซ้ำทันทีไม่ได้", async () => {
    const res = await identity.requestOtp(phone(1));
    assert.equal(res.testMode, true);
    assert.match(res.testCode, /^\d{6}$/);
    await expectReject(identity.requestOtp(phone(1)), /OTP_COOLDOWN/);
  });
  await test("production ที่ไม่ได้ตั้ง OTP_MODE = ปิด OTP", async () => {
    const saved = [process.env.OTP_MODE, process.env.NODE_ENV];
    delete process.env.OTP_MODE;
    process.env.NODE_ENV = "production";
    try {
      await expectReject(identity.requestOtp(phone(2)), /OTP_DISABLED/);
    } finally {
      [process.env.OTP_MODE, process.env.NODE_ENV] = saved;
      if (saved[1] === undefined) delete process.env.NODE_ENV;
    }
  });
  await test("กรอกผิด 5 ครั้ง รหัสที่ถูกก็ใช้ไม่ได้แล้ว", async () => {
    const code = await freshCode(phone(3));
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await expectReject(identity.verifyOtp({ phone: phone(3), code: wrong }), /ไม่ถูกต้อง/);
    await expectReject(identity.verifyOtp({ phone: phone(3), code }), /ไม่ถูกต้อง/);
  });

  console.log("สมัคร/เข้าระบบด้วย OTP");
  let userId;
  await test("เบอร์ใหม่ → ได้ตั๋วไปกรอกชื่อ → ได้บัญชีที่ยืนยันเบอร์แล้ว", async () => {
    const step = await identity.verifyOtp({ phone: phone(4), code: await freshCode(phone(4)) });
    assert.equal(step.needsName, true);
    const { user, token } = await identity.completeSignup({ ticket: step.ticket, fullName: "ทดสอบ OTP" });
    assert.ok(user.phoneVerifiedAt);
    assert.equal(user.hasPassword, false);
    assert.equal(verifyToken(token).role, "user");
    userId = user.id;
  });
  await test("ใช้ตั๋วซ้ำ/รหัสซ้ำไม่ได้ และเบอร์เดิมเข้าระบบได้ทันที", async () => {
    const code = await freshCode(phone(4));
    const { token } = await identity.verifyOtp({ phone: phone(4), code });
    assert.equal(verifyToken(token).id, userId);
    await expectReject(identity.verifyOtp({ phone: phone(4), code }), /ไม่ถูกต้อง/);
  });
  await test("บัญชีไม่มีรหัสผ่าน ล็อกอินด้วยอีเมล/รหัสผ่านไม่ได้", async () => {
    await expectReject(auth.loginUser({ email: "nobody@example.com", password: "x" }), /ไม่ถูกต้อง/);
  });

  console.log("ยืนยันตัวตนก่อนเรียกวิน");
  await test("ยังไม่มีเซลฟี่ → เรียกวินไม่ได้ (SELFIE_REQUIRED)", async () => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    assert.throws(() => identity.assertPassengerVerified(user), (e) => e.code === "SELFIE_REQUIRED");
  });
  await test("ยังไม่ยืนยันเบอร์ → PHONE_NOT_VERIFIED, ปิดด้วย PASSENGER_VERIFICATION=off ได้", async () => {
    const user = { phoneVerifiedAt: null, selfieFile: null };
    assert.throws(() => identity.assertPassengerVerified(user), (e) => e.code === "PHONE_NOT_VERIFIED");
    process.env.PASSENGER_VERIFICATION = "off";
    identity.assertPassengerVerified(user);
    delete process.env.PASSENGER_VERIFICATION;
  });

  console.log("สลับโหมด / สมัครขับ");
  await test("ยังไม่สมัครขับ → สลับเป็นคนขับไม่ได้ (NO_DRIVER_MODE)", async () => {
    await expectReject(identity.switchToDriver(userId), /NO_DRIVER_MODE/);
  });
  let driverId;
  await test("สมัครขับโดยไม่กรอกเบอร์วิน → ได้เลขถัดไปของพื้นที่ และ token คนขับ", async () => {
    const { driver, token } = await identity.becomeDriver(userId, { areaId: area.id, licensePlate: "ทด 1234" });
    assert.equal(driver.userId, userId);
    assert.equal(driver.verificationStatus, "PENDING");
    assert.match(driver.vinNumber, /^\d+$/);
    assert.equal(verifyToken(token).role, "driver");
    driverId = driver.id;
  });
  await test("สลับไปกลับได้ทั้งสองทาง และ /me บอกว่ามีโหมดคนขับ", async () => {
    assert.equal(verifyToken((await identity.switchToDriver(userId)).token).id, driverId);
    assert.equal(verifyToken((await identity.switchToUser(driverId)).token).id, userId);
    const me = await auth.getMe({ id: userId, role: "user" });
    assert.equal(me.driverMode.id, driverId);
  });
  await test("โหมดคนขับที่สมัครจากบัญชีผู้ใช้ ล็อกอินด้วยรหัสผ่านคนขับไม่ได้", async () => {
    await expectReject(auth.loginDriver({ phone: phone(4), password: "anything" }), /ไม่ถูกต้อง/);
  });
  await test("คนขับแบบเก่า (ไม่มีบัญชีผู้โดยสาร) กดสลับ → ได้บัญชีผู้โดยสารเบอร์เดียวกัน", async () => {
    const legacy = await auth.registerDriver({
      fullName: "วินเก่า", phone: phone(5), password: "x1234567", areaId: area.id, licensePlate: "ทด 5", vinNumber: `9${stamp}`,
    });
    const { user } = await identity.switchToUser(legacy.driver.id);
    assert.equal(user.phone, phone(5));
    const linked = await prisma.driver.findUnique({ where: { id: legacy.driver.id } });
    assert.equal(linked.userId, user.id);
  });
  await test("ผู้ใช้ที่ยืนยันเบอร์แล้ว + มีคนขับแบบเก่าเบอร์เดียวกัน → สมัครขับ = ผูกบัญชีเดิม", async () => {
    const legacy = await auth.registerDriver({
      fullName: "วินเก่า 2", phone: phone(6), password: "x1234567", areaId: area.id, licensePlate: "ทด 6", vinNumber: `8${stamp}`,
    });
    const step = await identity.verifyOtp({ phone: phone(6), code: await freshCode(phone(6)) });
    const { user } = await identity.completeSignup({ ticket: step.ticket, fullName: "วินเก่า 2" });
    const res = await identity.becomeDriver(user.id, { areaId: area.id, licensePlate: "ไม่ใช้" });
    assert.equal(res.linked, true);
    assert.equal(res.driver.id, legacy.driver.id);
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const like = { startsWith: `0996${stamp}` };
    await prisma.driver.deleteMany({ where: { phone: like } });
    await prisma.user.deleteMany({ where: { phone: like } });
    await prisma.phoneOtp.deleteMany({ where: { phone: like } });
    await prisma.$disconnect();
    console.log(`\n${passed} tests passed`);
  });
