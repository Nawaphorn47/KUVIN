// ทดสอบมาตรการความปลอดภัยของการยืนยันตัวตน — รัน: npm run test:security
// OTP (จำกัดการขอ/ล็อกเมื่อเดาผิด/โหมดทดสอบบน production), เอกสารคนขับเป็นไฟล์ส่วนตัว (ลิงก์เซ็นแล้ว อ้างไฟล์คนอื่นไม่ได้),
// ตรวจเนื้อไฟล์รูปจริง, ระงับบัญชีผู้ใช้แล้วโหมดคนขับใช้ต่อไม่ได้, JWT_SECRET บน production
// เรียก service ตรง ๆ ไม่ต้องเปิด API ต้องมีแค่ DB; ข้อมูลทดสอบใช้เบอร์ prefix 0994 แล้วลบทิ้งตอนจบ
require("dotenv").config();
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const prisma = require("../src/config/prisma");
const identity = require("../src/services/identity.service");
const driverSvc = require("../src/services/driver.service");
const privateUpload = require("../src/middlewares/privateUpload");
const { signedPath, fileFromToken, toRef } = require("../src/utils/privateFiles");
const { signToken } = require("../src/utils/jwt");
const { assertImageFile } = require("../src/utils/imageCheck");
const { assertNotSuspended, invalidateAccountStatus } = require("../src/utils/accountStatus");

const stamp = String(Date.now()).slice(-5);
const phone = (n) => `0994${stamp}${n}`;
const madeFiles = [];
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

function privateFile(owner, bytes = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]) {
  const name = `${owner}${crypto.randomUUID()}.jpg`;
  fs.writeFileSync(path.join(privateUpload.PRIVATE_DIR, name), Buffer.from(bytes));
  madeFiles.push(name);
  return name;
}

async function main() {
  process.env.OTP_MODE = "test";
  const area = await prisma.area.findFirst({ where: { isActive: true } });
  assert.ok(area, "ต้องมีพื้นที่ที่เปิดใช้งานอย่างน้อย 1 พื้นที่ (รัน seed ก่อน)");

  console.log("OTP");
  await test("ขอรหัสได้ไม่เกิน 5 ครั้ง/ชม. ต่อเบอร์ (แม้รอพ้นช่วงกันขอถี่แล้ว)", async () => {
    for (let i = 0; i < 5; i++) {
      await prisma.phoneOtp.updateMany({ where: { phone: phone(1) }, data: { sentAt: new Date(0) } });
      await identity.requestOtp(phone(1));
    }
    await prisma.phoneOtp.updateMany({ where: { phone: phone(1) }, data: { sentAt: new Date(0) } });
    await expectReject(identity.requestOtp(phone(1)), /OTP_SEND_LIMIT/);
  });
  await test("เดาผิดรวม 10 ครั้ง (ข้ามหลายรหัส) → เบอร์ถูกล็อก ขอ/ยืนยันรหัสไม่ได้ แม้รหัสถูก", async () => {
    const p = phone(2);
    let code;
    for (let round = 0; round < 2; round++) {
      await prisma.phoneOtp.updateMany({ where: { phone: p }, data: { sentAt: new Date(0) } });
      code = (await identity.requestOtp(p)).testCode;
      const wrong = code === "000000" ? "111111" : "000000";
      for (let i = 0; i < 5; i++) await expectReject(identity.verifyOtp({ phone: p, code: wrong }), /ไม่ถูกต้อง|OTP_LOCKED/);
    }
    await expectReject(identity.verifyOtp({ phone: p, code }), /OTP_LOCKED/);
    await prisma.phoneOtp.updateMany({ where: { phone: p }, data: { sentAt: new Date(0) } });
    await expectReject(identity.requestOtp(p), /OTP_LOCKED/);
  });
  await test("production + โหมดทดสอบ: ให้รหัสเฉพาะเบอร์ใน OTP_TEST_PHONES, * = ทุกเบอร์", async () => {
    const saved = [process.env.NODE_ENV, process.env.OTP_TEST_PHONES];
    process.env.NODE_ENV = "production";
    try {
      delete process.env.OTP_TEST_PHONES;
      await expectReject(identity.requestOtp(phone(3)), /OTP_TEST_PHONE_ONLY/);
      process.env.OTP_TEST_PHONES = `0800000000, ${phone(3)}`;
      assert.match((await identity.requestOtp(phone(3))).testCode, /^\d{6}$/);
      process.env.OTP_TEST_PHONES = "*";
      await identity.requestOtp(phone(4));
    } finally {
      if (saved[0] === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = saved[0];
      if (saved[1] === undefined) delete process.env.OTP_TEST_PHONES;
      else process.env.OTP_TEST_PHONES = saved[1];
    }
  });

  console.log("เอกสารส่วนตัว");
  const user = await prisma.user.create({ data: { fullName: "T-sec", phone: phone(5), phoneVerifiedAt: new Date() } });
  const { driver } = await identity.becomeDriver(user.id, { areaId: area.id, licensePlate: "ทด", driverType: "PUBLIC" });
  const other = await prisma.driver.create({
    data: { fullName: "T-sec-other", phone: phone(6), areaId: area.id, vinNumber: `6${stamp}`, licensePlate: "T" },
  });
  const owner = privateUpload.ownerPrefix("driver", driver.id);
  const fullDocs = () => ({
    photoUrl: toRef(privateFile(owner)),
    idCardPhotoUrl: toRef(privateFile(owner)),
    driverLicensePhotoUrl: toRef(privateFile(owner)),
    vehiclePhotoUrl: toRef(privateFile(owner)),
    platePhotoUrl: toRef(privateFile(owner)),
  });

  await test("ส่ง URL ภายนอกแทนไฟล์ที่อัปโหลด → ถูกปฏิเสธ", async () => {
    await expectReject(
      driverSvc.submitVerification(driver.id, { ...fullDocs(), idCardPhotoUrl: "https://evil.example/track.png" }),
      /ไม่ถูกต้อง/
    );
  });
  await test("อ้างไฟล์ของคนขับคนอื่น → ถูกปฏิเสธ", async () => {
    const stolen = toRef(privateFile(privateUpload.ownerPrefix("driver", other.id)));
    await expectReject(driverSvc.submitVerification(driver.id, { ...fullDocs(), photoUrl: stolen }), /ไม่ถูกต้อง/);
  });
  await test("ส่งครบ → API ส่งกลับเป็นลิงก์เซ็นแล้ว ไม่เผยชื่อไฟล์จริง และส่งรอบใหม่เปลี่ยนแค่บางใบได้", async () => {
    const d = await driverSvc.submitVerification(driver.id, fullDocs());
    assert.match(d.idCardPhotoUrl, /^\/api\/private-files\//);
    assert.ok(!d.idCardPhotoUrl.includes(owner));
    const again = await driverSvc.submitVerification(driver.id, { platePhotoUrl: toRef(privateFile(owner)) });
    assert.equal(again.verificationStatus, "PENDING");
  });
  await test("ลิงก์ไฟล์: token ถูกต้องเปิดได้, token ล็อกอินปกติ/ปลอม/หมดอายุใช้เปิดไฟล์ไม่ได้", async () => {
    const name = privateFile(owner);
    const link = signedPath(toRef(name));
    assert.equal(fileFromToken(link.split("/").pop()), name);
    assert.equal(fileFromToken(signToken({ id: user.id, role: "user" })), null);
    assert.equal(fileFromToken("not-a-token"), null);
    assert.equal(fileFromToken(signToken({ purpose: "file", file: name }, { expiresIn: -10 })), null);
  });
  await test("ชื่อไฟล์แบบ path traversal ถูกปฏิเสธ", async () => {
    assert.equal(privateUpload.resolve("../.env"), null);
    assert.equal(privateUpload.resolve("..\\..\\package.json"), null);
  });
  await test("ไฟล์ที่ไม่ใช่รูปจริง (เช่น HTML ปลอมนามสกุล) ถูกปฏิเสธและลบทิ้ง", async () => {
    const fake = privateFile(owner, [...Buffer.from("<html><script>")]);
    const p = path.join(privateUpload.PRIVATE_DIR, fake);
    await expectReject(assertImageFile(p), /ไม่ใช่รูปภาพ/);
    assert.equal(fs.existsSync(p), false);
    await assertImageFile(path.join(privateUpload.PRIVATE_DIR, privateFile(owner)));
  });

  console.log("ระงับบัญชี");
  await test("ระงับบัญชีผู้ใช้ → โหมดคนขับที่ผูกอยู่ใช้ต่อไม่ได้ด้วย, ปลดแล้วกลับมาใช้ได้", async () => {
    await assertNotSuspended("driver", driver.id);
    await prisma.user.update({ where: { id: user.id }, data: { isSuspended: true, suspendedReason: "ทดสอบ" } });
    invalidateAccountStatus("driver", driver.id);
    await expectReject(assertNotSuspended("driver", driver.id), /ACCOUNT_SUSPENDED/);
    await prisma.user.update({ where: { id: user.id }, data: { isSuspended: false, suspendedReason: null } });
    invalidateAccountStatus("driver", driver.id);
    await assertNotSuspended("driver", driver.id);
  });

  console.log("JWT_SECRET");
  await test("production ที่ไม่ตั้ง/ตั้งสั้น JWT_SECRET → server ไม่ยอมเริ่ม, ตั้งยาวพอ → ผ่าน", async () => {
    const run = (secret) =>
      execFileSync(process.execPath, ["-e", "require('./src/utils/jwt')"], {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env, NODE_ENV: "production", JWT_SECRET: secret },
        stdio: "pipe",
      });
    assert.throws(() => run(""));
    assert.throws(() => run("change_me"));
    assert.throws(() => run("short-secret"));
    run(crypto.randomBytes(32).toString("hex"));
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const like = { startsWith: `0994${stamp}` };
    await prisma.driver.deleteMany({ where: { phone: like } });
    await prisma.user.deleteMany({ where: { phone: like } });
    await prisma.phoneOtp.deleteMany({ where: { phone: like } });
    for (const f of madeFiles) fs.rmSync(path.join(privateUpload.PRIVATE_DIR, f), { force: true });
    await prisma.$disconnect();
    console.log(`\n${passed} tests passed`);
  });
