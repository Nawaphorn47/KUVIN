// ทดสอบแชตในทริป (ผู้โดยสาร ↔ คนขับ) — รัน: npm run test:chat
// เรียก chat.service ตรง ๆ ไม่ต้องเปิด API ต้องมีแค่ DB; ข้อมูลทดสอบใช้เบอร์ prefix 0995 แล้วลบทิ้งตอนจบ
require("dotenv").config();
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const chat = require("../src/services/chat.service");

const stamp = String(Date.now()).slice(-5);
const phone = (n) => `0995${stamp}${n}`;
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
    assert.match(err.message, pattern);
    return true;
  });
}

async function main() {
  const area = await prisma.area.findFirst({ where: { isActive: true } });
  assert.ok(area, "ต้องมีวิทยาเขตที่เปิดใช้งานอย่างน้อย 1 วิทยาเขต (รัน seed ก่อน)");
  const user = await prisma.user.create({ data: { fullName: "T-chat-user", phone: phone(1) } });
  const outsider = await prisma.user.create({ data: { fullName: "T-chat-out", phone: phone(2) } });
  const driver = await prisma.driver.create({
    data: { fullName: "T-chat-driver", phone: phone(3), areaId: area.id, vinNumber: `7${stamp}`, licensePlate: "T" },
  });
  const request = await prisma.serviceRequest.create({
    data: {
      areaId: area.id, userId: user.id, driverId: driver.id, status: "ACCEPTED",
      pickupLat: area.centerLat, pickupLng: area.centerLng, destinationLat: area.centerLat, destinationLng: area.centerLng,
    },
  });
  const asUser = { id: user.id, role: "user" };
  const asDriver = { id: driver.id, role: "driver" };
  const emitted = [];
  const io = { to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }) };

  await test("ผู้โดยสารส่ง → ส่ง event เข้าห้องของทริป และตัดช่องว่างหัวท้าย", async () => {
    const m = await chat.sendMessage(request.id, asUser, { body: "  รออยู่หน้าตึกค่ะ  " }, io);
    assert.equal(m.body, "รออยู่หน้าตึกค่ะ");
    assert.equal(m.senderRole, "user");
    assert.deepEqual(emitted.map((e) => [e.room, e.event]), [[`service-request:${request.id}`, "trip:message"]]);
  });
  await test("แค่นับข้อความใหม่ (peek) ไม่ทำเครื่องหมายว่าอ่านแล้ว", async () => {
    const res = await chat.listMessages(request.id, asDriver, { markRead: false });
    assert.equal(res.messages[0].readAt, null);
  });
  await test("คนขับเปิดอ่าน → เห็นข้อความ และข้อความของผู้โดยสารถูกทำเครื่องหมายว่าอ่านแล้ว", async () => {
    const res = await chat.listMessages(request.id, asDriver);
    assert.equal(res.open, true);
    assert.equal(res.messages.length, 1);
    assert.ok(res.messages[0].readAt);
  });
  await test("คนนอกทริปอ่าน/ส่งไม่ได้", async () => {
    await expectReject(chat.listMessages(request.id, { id: outsider.id, role: "user" }), /ไม่มีสิทธิ์/);
    await expectReject(chat.sendMessage(request.id, { id: outsider.id, role: "user" }, { body: "hi" }, io), /ไม่มีสิทธิ์/);
  });
  await test("ข้อความว่าง/ยาวเกินถูกปฏิเสธ", async () => {
    await expectReject(chat.sendMessage(request.id, asDriver, { body: "   " }, io), /พิมพ์ข้อความ/);
    await expectReject(chat.sendMessage(request.id, asDriver, { body: "ก".repeat(chat.BODY_MAX + 1) }, io), /ไม่เกิน/);
    await expectReject(chat.sendMessage(request.id, asDriver, { body: { x: 1 } }, io), /พิมพ์ข้อความ/);
  });
  await test("จบทริปแล้ว → ยังอ่านย้อนหลังได้ แต่ส่งใหม่ไม่ได้", async () => {
    await prisma.serviceRequest.update({ where: { id: request.id }, data: { status: "COMPLETED" } });
    const res = await chat.listMessages(request.id, asUser);
    assert.equal(res.open, false);
    await expectReject(chat.sendMessage(request.id, asUser, { body: "ขอบคุณค่ะ" }, io), /ระหว่างที่ทริป/);
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const like = { startsWith: `0995${stamp}` };
    await prisma.serviceRequest.deleteMany({ where: { user: { phone: like } } });
    await prisma.driver.deleteMany({ where: { phone: like } });
    await prisma.user.deleteMany({ where: { phone: like } });
    await prisma.$disconnect();
    console.log(`\n${passed} tests passed`);
  });
