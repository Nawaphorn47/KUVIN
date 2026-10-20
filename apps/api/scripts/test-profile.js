// ทดสอบรูปโปรไฟล์ (บัญชีเดียวใช้รูปเดียวทั้งโหมดผู้โดยสาร/คนขับ) — รัน: npm run test:profile
// เรียก user.service ตรง ๆ ไม่ต้องเปิด API ต้องมีแค่ DB; ข้อมูลทดสอบใช้เบอร์ prefix 0993 แล้วลบทิ้งตอนจบ
require("dotenv").config();
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const prisma = require("../src/config/prisma");
const userService = require("../src/services/user.service");
const { AVATAR_DIR } = require("../src/middlewares/avatarUpload");
const { presentRequest } = require("../src/utils/tripPrivacy");

const stamp = String(Date.now()).slice(-5);
const phone = (n) => `0993${stamp}${n}`;
const made = [];
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

// จำลองไฟล์ที่ multer เพิ่งบันทึก
function fakeUpload(name) {
  fs.writeFileSync(path.join(AVATAR_DIR, name), "x");
  made.push(name);
  return { filename: name, path: path.join(AVATAR_DIR, name) };
}
const exists = (name) => fs.existsSync(path.join(AVATAR_DIR, name));

async function main() {
  const area = await prisma.area.findFirst({ where: { isActive: true } });
  assert.ok(area, "ต้องมีวิทยาเขตที่เปิดใช้งานอย่างน้อย 1 วิทยาเขต");
  const user = await prisma.user.create({ data: { fullName: "T-profile-user", phone: phone(1) } });
  const owner = await prisma.user.create({ data: { fullName: "T-profile-owner", phone: phone(2) } });
  const driver = await prisma.driver.create({
    data: { fullName: "T-profile-driver", phone: phone(3), userId: owner.id, areaId: area.id, vinNumber: `8${stamp}`, licensePlate: "T" },
  });
  const legacy = await prisma.driver.create({
    data: { fullName: "T-profile-legacy", phone: phone(4), areaId: area.id, vinNumber: `9${stamp}`, licensePlate: "T" },
  });
  const asUser = { id: user.id, role: "user" };
  const asDriver = { id: driver.id, role: "driver" };

  await test("ตั้งรูปโปรไฟล์ → ได้ avatarUrl และไม่เปิดเผยชื่อไฟล์ดิบ", async () => {
    const res = await userService.saveAvatar(asUser, fakeUpload(`t${stamp}-a.jpg`));
    assert.equal(res.avatarUrl, `/uploads/avatars/t${stamp}-a.jpg`);
    assert.equal("avatarFile" in res, false);
  });
  await test("เปลี่ยนรูปใหม่ → ไฟล์เก่าถูกลบออกจากดิสก์", async () => {
    await userService.saveAvatar(asUser, fakeUpload(`t${stamp}-b.jpg`));
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(exists(`t${stamp}-a.jpg`), false);
    assert.equal(exists(`t${stamp}-b.jpg`), true);
  });
  await test("ลบรูป → avatarUrl เป็น null และไฟล์หาย", async () => {
    const res = await userService.removeAvatar(asUser);
    assert.equal(res.avatarUrl, null);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(exists(`t${stamp}-b.jpg`), false);
  });
  await test("โหมดคนขับ (token คนขับ) → รูปไปอยู่ที่บัญชีผู้ใช้เจ้าของโหมดคนขับ", async () => {
    await userService.saveAvatar(asDriver, fakeUpload(`t${stamp}-c.jpg`));
    const row = await prisma.user.findUnique({ where: { id: owner.id } });
    assert.equal(row.avatarFile, `t${stamp}-c.jpg`);
  });
  await test("คนขับแบบเก่าที่ไม่มีบัญชีผู้ใช้ → ปฏิเสธ และลบไฟล์ที่เพิ่งอัปโหลดทิ้ง", async () => {
    const file = fakeUpload(`t${stamp}-d.jpg`);
    await assert.rejects(userService.saveAvatar({ id: legacy.id, role: "driver" }, file), /บัญชีคนขับแบบเก่า/);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(exists(`t${stamp}-d.jpg`), false);
  });
  await test("ไม่มีไฟล์ → ปฏิเสธ", async () => {
    await assert.rejects(userService.saveAvatar(asUser, undefined), /ไม่พบไฟล์รูป/);
  });
  await test("ทริป: ผู้โดยสาร/คนขับเห็น avatarUrl ของอีกฝ่าย และไม่มีฟิลด์ภายในหลุด (เบอร์ยังซ่อนตามสถานะ)", async () => {
    await userService.saveAvatar(asUser, fakeUpload(`t${stamp}-e.jpg`));
    const raw = {
      status: "PENDING",
      user: { id: user.id, fullName: "u", phone: "0800000000", avatarFile: `t${stamp}-e.jpg` },
      driver: { id: driver.id, fullName: "d", phone: "0800000001", user: { avatarFile: `t${stamp}-c.jpg` } },
    };
    const pending = presentRequest(raw);
    assert.equal(pending.user.avatarUrl, `/uploads/avatars/t${stamp}-e.jpg`);
    assert.equal(pending.driver.avatarUrl, `/uploads/avatars/t${stamp}-c.jpg`);
    assert.equal(pending.user.phone, null);
    assert.equal("avatarFile" in pending.user, false);
    assert.equal("user" in pending.driver, false);
    const accepted = presentRequest({ ...raw, status: "ACCEPTED" });
    assert.equal(accepted.user.phone, "0800000000");
    assert.equal(accepted.driver.avatarUrl, `/uploads/avatars/t${stamp}-c.jpg`);
    assert.equal(presentRequest({ status: "ACCEPTED", user: null, driver: null }).driver, null);
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const like = { startsWith: `0993${stamp}` };
    await prisma.driver.deleteMany({ where: { phone: like } });
    await prisma.user.deleteMany({ where: { phone: like } });
    for (const f of made) fs.rmSync(path.join(AVATAR_DIR, f), { force: true });
    await prisma.$disconnect();
    console.log(`\n${passed} tests passed`);
  });
