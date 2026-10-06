// ทดสอบแพลตฟอร์มหลายพื้นที่ + สิทธิ์แอดมิน 2 ระดับ + การเงินคนขับ — รัน: npm run test:platform (ไม่ต้องเปิด API)
// สร้างพื้นที่ทดสอบ (เชียงใหม่ — ไกลจาก มก. กำแพงแสนมาก) พร้อมคนขับ/ผู้ใช้/แอดมินชั่วคราว แล้วลบทิ้งทั้งหมดตอนจบ
require("dotenv").config();
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const geo = require("../src/utils/geo");
const areaService = require("../src/services/area.service");
const adminService = require("../src/services/admin.service");
const adminAccounts = require("../src/services/adminAccount.service");
const landmarkService = require("../src/services/landmark.service");
const sosService = require("../src/services/sos.service");
const finance = require("../src/services/finance.service");
const auth = require("../src/services/auth.service");
const q = require("../src/services/queue.service");
const { adminScope } = require("../src/middlewares/adminScope");

const KPS = "area-ku-kps";
const PREFIX = "0996"; // เบอร์ชั่วคราว 0996xxxxxx
const stamp = Date.now();
const SLUG = `test-cm-${stamp}`;
const CM = { lat: 18.7883, lng: 98.9853 }; // กลางเมืองเชียงใหม่
let passed = 0;
let seq = 0;
const phone = () => `${PREFIX}${String(stamp).slice(-4)}${String(++seq).padStart(2, "0")}`;

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

const superScope = { adminId: "x", isSuper: true, areaId: null };
let cm; // พื้นที่ทดสอบ
let cmScope;
let kpsScope;
const created = { drivers: [], users: [], admins: [] };

async function mkDriver(areaId, vin, extra = {}) {
  const d = await prisma.driver.create({
    data: {
      fullName: `T-plat-${vin}`,
      phone: phone(),
      passwordHash: "x",
      areaId,
      vinNumber: vin,
      licensePlate: "T",
      verificationStatus: "APPROVED",
      ...extra,
    },
  });
  created.drivers.push(d.id);
  return d;
}

async function mkUser() {
  const u = await prisma.user.create({
    data: { fullName: "T-plat-user", phone: phone(), email: `plat-${stamp}-${seq}@example.com`, passwordHash: "x" },
  });
  created.users.push(u.id);
  return u;
}

async function main() {
  cm = await areaService.createArea({
    slug: SLUG,
    name: "พื้นที่ทดสอบเชียงใหม่",
    displayName: "ทดสอบ CM",
    centerLat: CM.lat,
    centerLng: CM.lng,
    flatRadiusKm: 1,
    serviceRadiusKm: 10,
    flatFare: 30,
    ratePerKm: 12,
    minFare: 25,
    emergencyContacts: [{ label: "รปภ. ทดสอบ", phone: "053-000-000" }],
  });
  cmScope = { adminId: "x", isSuper: false, areaId: cm.id };
  kpsScope = { adminId: "x", isSuper: false, areaId: KPS };

  console.log("พื้นที่ + ค่าโดยสาร");
  await test("ค่าโดยสารคิดตามอัตราของพื้นที่นั้น (เหมาจ่าย / ต่อ กม. / ขั้นต่ำ)", () => {
    const near = { lat: CM.lat + 0.001, lng: CM.lng };
    assert.equal(geo.calculateFare(cm, { pickup: CM, destination: near }).fare, 30);
    const far = geo.calculateFare(cm, { pickup: CM, destination: CM, routeDistanceKm: 5 });
    // จุดเดียวกันอยู่ในเขตเหมาจ่าย → 30; นอกเขต: 5 กม. × 12 = 60
    assert.equal(far.fare, 30);
    const out = { lat: CM.lat + 0.05, lng: CM.lng };
    assert.equal(geo.calculateFare(cm, { pickup: CM, destination: out, routeDistanceKm: 5 }).fare, 60);
    assert.equal(geo.calculateFare(cm, { pickup: CM, destination: out, routeDistanceKm: 1 }).fare, 25); // ขั้นต่ำ
  });
  await test("หาพื้นที่จากพิกัด: เชียงใหม่ → พื้นที่ทดสอบ, กำแพงแสน → KPS, กรุงเทพฯ → ไม่อยู่ในพื้นที่ใด", async () => {
    assert.equal((await areaService.findForPoint(CM)).id, cm.id);
    assert.equal((await areaService.findForPoint({ lat: 14.023, lng: 99.9739 })).id, KPS);
    assert.equal(await areaService.findForPoint({ lat: 13.7563, lng: 100.5018 }), null);
  });
  await test("เลือกพื้นที่เองแต่จุดรับอยู่นอกพื้นที่นั้น → ใช้พื้นที่ที่ครอบคลุมจุดรับแทน; นอกทุกพื้นที่ → ปฏิเสธ", async () => {
    assert.equal((await areaService.resolveForPickup(CM, KPS)).id, cm.id);
    await expectReject(areaService.resolveForPickup({ lat: 13.7563, lng: 100.5018 }), /นอกพื้นที่ให้บริการ/);
  });
  await test("ปิดพื้นที่แล้วหาไม่เจอ และพื้นที่ใหม่ต้องมีรหัสไม่ซ้ำ", async () => {
    await expectReject(areaService.createArea({ slug: SLUG, name: "x", displayName: "x", centerLat: 18, centerLng: 99 }), /ถูกใช้แล้ว/);
    await areaService.updateArea(superScope, cm.id, { isActive: false });
    assert.equal(await areaService.findForPoint(CM), null);
    await areaService.updateArea(superScope, cm.id, { isActive: true });
  });

  console.log("คนขับ + คิวแยกตามพื้นที่");
  await test("เบอร์วินซ้ำได้ข้ามพื้นที่ แต่ซ้ำในพื้นที่เดียวกันไม่ได้", async () => {
    const vin = String(90000 + (stamp % 9000));
    await mkDriver(KPS, vin);
    await mkDriver(cm.id, vin);
    await expectReject(
      auth.registerDriver({ fullName: "T", phone: phone(), password: "x1234567", areaId: cm.id, vinNumber: vin, licensePlate: "T" }),
      /มีคนขับใช้แล้วในพื้นที่นี้/
    );
  });
  await test("สมัครคนขับต้องเลือกพื้นที่ที่เปิดอยู่", async () => {
    await expectReject(
      auth.registerDriver({ fullName: "T", phone: phone(), password: "x1234567", vinNumber: "5", licensePlate: "T" }),
      /เลือกพื้นที่/
    );
  });
  await test("คำขอในพื้นที่ทดสอบเสนองานให้คนขับในพื้นที่นั้นเท่านั้น แม้คนขับ KPS เข้าคิวก่อน", async () => {
    const kpsDriver = await mkDriver(KPS, `K${stamp % 100000}`);
    const cmDriver = await mkDriver(cm.id, `C${stamp % 100000}`);
    await q.goOnline(kpsDriver.id); // เข้าคิวก่อน
    await q.goOnline(cmDriver.id);
    const user = await mkUser();
    const r = await prisma.serviceRequest.create({
      data: { userId: user.id, areaId: cm.id, pickupLat: CM.lat, pickupLng: CM.lng, destinationLat: CM.lat, destinationLng: CM.lng, fare: 30 },
    });
    const offered = await q.dispatchRequest(r.id, null);
    assert.equal(offered.offeredDriverId, cmDriver.id);
    const overview = await q.getQueueOverview(cmDriver.id);
    assert.deepEqual(overview.queue.map((x) => x.driverId), [cmDriver.id]);
    await q.goOffline(kpsDriver.id, null);
    await q.goOffline(cmDriver.id, null);
  });

  console.log("สิทธิ์แอดมิน");
  await test("แอดมินพื้นที่เห็นเฉพาะคนขับ/ทริป/สถิติของพื้นที่ตัวเอง", async () => {
    const cmDrivers = await adminService.listDrivers(cmScope, { q: "T-plat" });
    assert.ok(cmDrivers.length > 0 && cmDrivers.every((d) => d.areaId === cm.id));
    const trips = await adminService.listTrips(cmScope);
    assert.ok(trips.every((t) => t.areaId === cm.id));
    const kpsDriver = (await adminService.listDrivers(kpsScope, { q: "T-plat" }))[0];
    await expectReject(adminService.getDriverDetail(cmScope, kpsDriver.id), /ไม่พบคนขับนี้/);
    await expectReject(adminService.approveDriver(cmScope, kpsDriver.id, null), /ไม่พบคนขับนี้/);
    const stats = await adminService.getStats(cmScope);
    assert.equal(stats.approvedDrivers, cmDrivers.filter((d) => d.verificationStatus === "APPROVED").length);
  });
  await test("แอดมินพื้นที่เห็นเฉพาะผู้โดยสารที่เคยใช้บริการในพื้นที่ตัวเอง", async () => {
    const kpsOnlyUser = await mkUser();
    await prisma.serviceRequest.create({
      data: { userId: kpsOnlyUser.id, areaId: KPS, status: "CANCELLED", pickupLat: 14, pickupLng: 99, destinationLat: 14, destinationLng: 99, fare: 20 },
    });
    await expectReject(adminService.getUserDetail(cmScope, kpsOnlyUser.id), /ไม่พบผู้ใช้นี้/);
    await expectReject(adminService.suspendAccount(cmScope, "user", kpsOnlyUser.id, "x", null), /ไม่พบผู้ใช้นี้/);
    assert.equal((await adminService.getUserDetail(kpsScope, kpsOnlyUser.id)).profile.id, kpsOnlyUser.id);
  });
  await test("สถานที่: แอดมินพื้นที่สร้างได้แค่ในพื้นที่ตัวเอง แก้ของพื้นที่อื่นไม่ได้, super ต้องเลือกพื้นที่", async () => {
    const lm = await landmarkService.createLandmark(cmScope, { name: "T-plat-lm", lat: CM.lat, lng: CM.lng, areaId: KPS });
    assert.equal(lm.areaId, cm.id);
    await expectReject(landmarkService.updateLandmark(kpsScope, lm.id, { name: "x" }), /ไม่พบสถานที่นี้/);
    await expectReject(landmarkService.createLandmark(superScope, { name: "x", lat: CM.lat, lng: CM.lng }), /เลือกพื้นที่/);
    const list = await landmarkService.listLandmarks({ areaId: cm.id });
    assert.deepEqual(list.map((l) => l.id), [lm.id]);
  });
  await test("ตั้งค่าพื้นที่: แอดมินพื้นที่แก้ค่าโดยสารได้ แต่ปิดพื้นที่/เปลี่ยนรหัส/แก้พื้นที่อื่นไม่ได้", async () => {
    const updated = await areaService.updateArea(cmScope, cm.id, { flatFare: 35, isActive: false, slug: "hacked" });
    assert.equal(updated.flatFare, 35);
    assert.equal(updated.isActive, true);
    assert.equal(updated.slug, SLUG);
    await expectReject(areaService.updateArea(cmScope, KPS, { flatFare: 1 }), /ไม่พบพื้นที่นี้/);
    await expectReject(areaService.updateArea(cmScope, cm.id, { flatRadiusKm: 20 }), /ไม่น้อยกว่ารัศมีเขตเหมาจ่าย/);
  });
  await test("แอดมินพื้นที่ส่ง X-Area-Id ของพื้นที่อื่นมา ก็ยังถูกจำกัดที่พื้นที่ตัวเอง", async () => {
    const admin = await adminAccounts.createAdmin({
      fullName: "T-plat-admin",
      email: `plat-admin-${stamp}@example.com`,
      password: "test-password-123",
      role: "AREA_ADMIN",
      areaId: cm.id,
    });
    created.admins.push(admin.id);
    const req = { auth: { id: admin.id }, get: (h) => (h.toLowerCase() === "x-area-id" ? KPS : undefined) };
    await new Promise((resolve, reject) => adminScope(req, {}, (err) => (err ? reject(err) : resolve())));
    assert.deepEqual(req.adminScope, { adminId: admin.id, isSuper: false, areaId: cm.id });
  });
  await test("บัญชีแอดมิน: แอดมินพื้นที่ต้องผูกพื้นที่, ลดสิทธิ์ super คนสุดท้าย/ลบตัวเองไม่ได้", async () => {
    await expectReject(
      adminAccounts.createAdmin({ fullName: "x", email: `x-${stamp}@example.com`, password: "test-password-123", role: "AREA_ADMIN" }),
      /เลือกพื้นที่/
    );
    const supers = await prisma.admin.findMany({ where: { role: "SUPER_ADMIN" } });
    if (supers.length === 1) {
      await expectReject(adminAccounts.updateAdmin("someone-else", supers[0].id, { role: "AREA_ADMIN", areaId: cm.id }), /super admin อย่างน้อย 1 คน/);
    }
    await expectReject(adminAccounts.deleteAdmin(created.admins[0], created.admins[0]), /ลบบัญชีของตัวเองไม่ได้/);
  });
  await test("SOS ของคนขับพื้นที่ทดสอบผูกกับพื้นที่นั้น แอดมิน KPS เห็น/ปิดเคสไม่ได้", async () => {
    const cmDriver = (await adminService.listDrivers(cmScope, { q: "T-plat" }))[0];
    const alert = await sosService.createAlert({ role: "driver", id: cmDriver.id }, { lat: CM.lat, lng: CM.lng }, null);
    assert.equal(alert.areaId, cm.id);
    assert.ok(!(await sosService.listAlerts(kpsScope)).some((a) => a.id === alert.id));
    await expectReject(sosService.resolveAlert(kpsScope, alert.id), /ไม่พบรายการแจ้งเหตุนี้/);
    await sosService.resolveAlert(cmScope, alert.id, "ทดสอบ");
  });

  console.log("การเงินคนขับ");
  await test("ช่วงวัน/สัปดาห์/เดือนตัดตามเวลาไทย (เที่ยงคืนไทย = 17:00 UTC ของวันก่อน)", () => {
    const now = new Date("2026-10-06T02:00:00Z"); // 09:00 น. วันที่ 6 ต.ค. เวลาไทย
    const days = finance.buildBuckets("day", now);
    assert.equal(days.length, 7);
    assert.equal(days[6].start.toISOString(), "2026-10-05T17:00:00.000Z");
    const weeks = finance.buildBuckets("week", now);
    assert.equal(weeks[7].start.toISOString(), "2026-10-04T17:00:00.000Z"); // จันทร์ที่ 5 ต.ค. เวลาไทย
    const months = finance.buildBuckets("month", now);
    assert.equal(months[5].start.toISOString(), "2026-09-30T17:00:00.000Z");
    assert.equal(months[5].label, "ต.ค. 69");
  });
  await test("อัตราสิ้นเปลืองจริงจากเลขไมล์ระหว่างการเติมเต็มถัง", () => {
    const km = finance.measuredKmPerLiter([
      { odometerKm: 1000, liters: 3 },
      { odometerKm: 1120, liters: 3 },
      { odometerKm: 1250, liters: 3.25 },
    ]);
    assert.equal(km, 40); // (120 + 130) / (3 + 3.25)
    assert.equal(finance.measuredKmPerLiter([{ odometerKm: 1000, liters: 3 }]), null);
  });
  await test("สรุปวันนี้: ไม่จดน้ำมัน = ประมาณจากระยะทาง, จดแล้ว = ใช้ตัวเลขจริง + ค่าใช้จ่ายอื่น", async () => {
    const driver = await mkDriver(cm.id, `F${stamp % 100000}`);
    await finance.updateVehicle(driver.id, { fuelKmPerLiter: 40, fuelPricePerLiter: 40 });
    const user = await mkUser();
    await prisma.serviceRequest.create({
      data: {
        userId: user.id, driverId: driver.id, areaId: cm.id, status: "COMPLETED", fare: 50, distanceKm: 10,
        pickupLat: CM.lat, pickupLng: CM.lng, destinationLat: CM.lat, destinationLng: CM.lng, completedAt: new Date(),
      },
    });
    let today = (await finance.getSummary(driver.id, "day")).series.at(-1);
    assert.equal(today.income, 50);
    assert.equal(today.fuelSource, "estimated");
    assert.equal(today.fuelCost, 10); // 10 กม. ÷ 40 กม./ลิตร × 40 บาท
    assert.equal(today.profit, 40);

    await finance.createExpense(driver.id, { category: "FUEL", amount: 100, liters: 2.5 });
    await finance.createExpense(driver.id, { category: "TIRE", amount: 500, liters: 9 });
    const summary = await finance.getSummary(driver.id, "day");
    today = summary.series.at(-1);
    assert.equal(today.fuelSource, "recorded");
    assert.equal(today.fuelCost, 100);
    assert.equal(today.expenses, 600);
    assert.equal(today.profit, -550);
    assert.deepEqual(summary.byCategory.map((c) => c.category).sort(), ["FUEL", "TIRE"]);
    const tire = (await finance.listExpenses(driver.id)).find((e) => e.category === "TIRE");
    assert.equal(tire.liters, null); // ลิตรมีความหมายเฉพาะน้ำมัน
  });
  await test("รายจ่าย: จำนวนเงินผิดถูกปฏิเสธ, แก้/ลบรายการของคนอื่นไม่ได้", async () => {
    const [a, b] = [await mkDriver(cm.id, `A${stamp % 100000}`), await mkDriver(cm.id, `B${stamp % 100000}`)];
    await expectReject(finance.createExpense(a.id, { category: "TIRE", amount: -5 }), /มากกว่า 0/);
    await expectReject(finance.createExpense(a.id, { category: "BOGUS", amount: 5 }), /หมวดรายจ่าย/);
    const e = await finance.createExpense(a.id, { category: "REPAIR", amount: 300 });
    await expectReject(finance.updateExpense(b.id, e.id, { amount: 1 }), /ไม่พบรายการนี้/);
    await expectReject(finance.deleteExpense(b.id, e.id), /ไม่พบรายการนี้/);
    await finance.deleteExpense(a.id, e.id);
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const areaId = cm?.id;
    if (areaId) {
      await prisma.serviceRequest.deleteMany({ where: { areaId } });
      await prisma.sosAlert.deleteMany({ where: { areaId } });
      await prisma.landmark.deleteMany({ where: { areaId } });
    }
    await prisma.serviceRequest.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.admin.deleteMany({ where: { id: { in: created.admins } } });
    await prisma.driver.deleteMany({ where: { id: { in: created.drivers } } }); // รายจ่ายลบตาม (cascade)
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    if (areaId) await prisma.area.delete({ where: { id: areaId } }).catch(() => {});
    await prisma.$disconnect();
    console.log(`\n${passed} tests passed`);
  });
