// ทดสอบความปลอดภัยระหว่างทริปฝั่งผู้ใช้ — รัน: npm run test:trip-safety
// ลิงก์แชร์ทริป, ซ่อนเบอร์โทรหลังจบทริป, แจ้งปัญหาหลังทริป + แอดมินปิดเคส
// เรียก service ตรง ๆ ไม่ต้องเปิด API ต้องมีแค่ DB; ข้อมูลทดสอบใช้เบอร์ prefix 0992 แล้วลบทิ้งตอนจบ
require("dotenv").config();
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const service = require("../src/services/serviceRequest.service");
const safety = require("../src/services/tripSafety.service");
const { presentRequest } = require("../src/utils/tripPrivacy");
const { signToken } = require("../src/utils/jwt");

const stamp = String(Date.now()).slice(-5);
const phone = (n) => `0992${stamp}${n}`;
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

async function main() {
  const area = await prisma.area.findFirst({ where: { isActive: true } });
  const otherArea = await prisma.area.findFirst({ where: { isActive: true, id: { not: area.id } } });
  assert.ok(area, "ต้องมีพื้นที่ที่เปิดใช้งานอย่างน้อย 1 พื้นที่ (รัน seed ก่อน)");
  const user = await prisma.user.create({ data: { fullName: "สมใจ ทดสอบปลอดภัย", phone: phone(1) } });
  const stranger = await prisma.user.create({ data: { fullName: "คนแปลกหน้า", phone: phone(2) } });
  const driver = await prisma.driver.create({
    data: { fullName: "สมชาย ทดสอบ", phone: phone(3), areaId: area.id, vinNumber: `5${stamp}`, licensePlate: "ทด 1", currentLat: 14.02, currentLng: 99.97 },
  });
  const mkTrip = (status, extra = {}) =>
    prisma.serviceRequest.create({
      data: {
        areaId: area.id, userId: user.id, driverId: driver.id, status, acceptedAt: new Date(),
        pickupLat: area.centerLat, pickupLng: area.centerLng, pickupAddress: "หน้าตึก A",
        destinationLat: area.centerLat, destinationLng: area.centerLng, destinationAddress: "โรงอาหาร", fare: 20, ...extra,
      },
    });
  const asUser = { id: user.id, role: "user" };
  const asDriver = { id: driver.id, role: "driver" };

  // ทริปที่จบแล้ว 2 เที่ยว ใช้กับเคสซ่อนเบอร์และแจ้งปัญหา
  const trip = await mkTrip("COMPLETED", { completedAt: new Date() });
  await mkTrip("COMPLETED", { completedAt: new Date() });

  console.log("แชร์ทริป");
  const live = await mkTrip("IN_PROGRESS");
  let shareToken;
  await test("ผู้โดยสารสร้างลิงก์ได้ คนขับ/คนอื่นสร้างไม่ได้", async () => {
    ({ token: shareToken } = await safety.createShareLink(live.id, asUser));
    await expectReject(safety.createShareLink(live.id, asDriver), /ผู้โดยสารเท่านั้น/);
    await expectReject(safety.createShareLink(live.id, { id: stranger.id, role: "user" }), /ไม่มีสิทธิ์/);
  });
  await test("หน้าแชร์เห็นชื่อเล่น ป้ายทะเบียน ตำแหน่งสด แต่ไม่มีเบอร์โทร/นามสกุล", async () => {
    const view = await safety.publicShareView(shareToken);
    assert.equal(view.active, true);
    assert.equal(view.passengerFirstName, "สมใจ");
    assert.equal(view.driver.firstName, "สมชาย");
    assert.equal(view.driver.licensePlate, "ทด 1");
    assert.ok(view.driver.location);
    const json = JSON.stringify(view);
    for (const secret of [phone(1), phone(3), "ทดสอบปลอดภัย"]) assert.ok(!json.includes(secret), `หลุด: ${secret}`);
  });
  await test("จบทริปแล้ว ลิงก์เดิมไม่บอกตำแหน่งคนขับ, token ปลอม/token ล็อกอินเปิดไม่ได้", async () => {
    await prisma.serviceRequest.update({ where: { id: live.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    const view = await safety.publicShareView(shareToken);
    assert.equal(view.active, false);
    assert.equal(view.driver.location, null);
    await expectReject(safety.publicShareView("garbage"), /หมดอายุ/);
    await expectReject(safety.publicShareView(signToken({ id: user.id, role: "user" })), /หมดอายุ/);
    await expectReject(safety.createShareLink(live.id, asUser), /จบแล้ว/);
  });

  console.log("ซ่อนเบอร์โทร");
  await test("เห็นเบอร์อีกฝ่ายเฉพาะตอนทริปกำลังดำเนินอยู่ ประวัติ/งานที่ยังไม่รับไม่เห็นเบอร์", async () => {
    const history = presentRequest(await service.listForUser(user.id));
    assert.ok(history.length >= 3);
    assert.ok(history.every((t) => t.driver?.phone === null));
    const active = await mkTrip("ACCEPTED");
    const shown = presentRequest(await service.getById(active.id, asUser));
    assert.equal(shown.driver.phone, phone(3));
    const offered = presentRequest({ ...shown, status: "PENDING" });
    assert.equal(offered.user.phone, null);
    await prisma.serviceRequest.update({ where: { id: active.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  });

  console.log("แจ้งปัญหา");
  let report;
  await test("ผู้โดยสารแจ้งปัญหาได้ หมวดต้องถูกต้อง, \"อื่น ๆ\" ต้องมีรายละเอียด, แจ้งซ้ำขณะยังเปิดอยู่ไม่ได้", async () => {
    await expectReject(safety.createReport(trip.id, asUser, { category: "NO_PAY" }), /เลือกหัวข้อ/); // หมวดของคนขับ
    await expectReject(safety.createReport(trip.id, asUser, { category: "OTHER" }), /รายละเอียด/);
    report = await safety.createReport(trip.id, asUser, { category: "DANGEROUS_DRIVING", detail: "ขี่เร็วมากตอนเลี้ยว" });
    assert.equal(report.areaId, area.id);
    await expectReject(safety.createReport(trip.id, asUser, { category: "OVERCHARGE" }), /แจ้งปัญหาทริปนี้ไว้แล้ว/);
  });
  await test("คนขับแจ้งปัญหาของตัวเองได้ คนนอกทริปแจ้งไม่ได้ เกิน 7 วันแจ้งไม่ได้", async () => {
    await safety.createReport(trip.id, asDriver, { category: "NO_PAY" });
    await expectReject(safety.createReport(trip.id, { id: stranger.id, role: "user" }, { category: "OTHER", detail: "x" }), /ไม่มีสิทธิ์/);
    const old = await mkTrip("COMPLETED", { completedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000) });
    await expectReject(safety.createReport(old.id, asUser, { category: "LOST_ITEM" }), /7 วัน/);
  });
  await test("แอดมินพื้นที่เห็น/ปิดเคสได้เฉพาะพื้นที่ตัวเอง และเคสด่วนถูกติดป้าย", async () => {
    const mine = await safety.listReports({ areaId: area.id }, { status: "OPEN" });
    const found = mine.find((r) => r.id === report.id);
    assert.ok(found);
    assert.equal(found.urgent, true);
    assert.equal(found.categoryLabel, "ขับรถอันตราย");
    if (otherArea) {
      const theirs = await safety.listReports({ areaId: otherArea.id }, { status: "OPEN" });
      assert.ok(!theirs.some((r) => r.id === report.id));
      await expectReject(safety.resolveReport({ areaId: otherArea.id }, report.id, "x"), /ไม่พบ/);
    }
    const closed = await safety.resolveReport({ areaId: area.id }, report.id, "ตักเตือนคนขับแล้ว");
    assert.equal(closed.status, "RESOLVED");
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const like = { startsWith: `0992${stamp}` };
    await prisma.serviceRequest.deleteMany({ where: { user: { phone: like } } });
    await prisma.driver.deleteMany({ where: { phone: like } });
    await prisma.user.deleteMany({ where: { phone: like } });
    await prisma.$disconnect();
    console.log(`\n${passed} tests passed`);
  });
