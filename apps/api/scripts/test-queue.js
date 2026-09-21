// ทดสอบ logic คิว FIFO กับ Postgres จริง (รวม concurrency) — รัน: npm run test:queue
// สร้างคนขับ/ผู้ใช้ชั่วคราวขึ้นมาเอง (prefix 0999TEST) แล้วลบทิ้งตอนจบ, สถานะออนไลน์/คิวของคนขับจริงจะถูกเก็บไว้แล้วคืนให้
require("dotenv").config();
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const q = require("../src/services/queue.service");

const PREFIX = "0999TEST";
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

const drivers = {};
async function mkDriver(name) {
  drivers[name] = await prisma.driver.create({
    data: {
      fullName: `T-${name}`,
      phone: `${PREFIX}${name}`,
      passwordHash: "x",
      vinNumber: `T${name}${Date.now() % 100000}`,
      licensePlate: "T",
      verificationStatus: "APPROVED",
    },
  });
  return drivers[name];
}
const id = (n) => drivers[n].id;
const nameOf = (driverId) => Object.keys(drivers).find((k) => drivers[k].id === driverId);

async function resetQueue(names) {
  await prisma.serviceRequest.deleteMany({ where: { user: { phone: { startsWith: PREFIX } } } });
  await prisma.driver.updateMany({
    where: { phone: { startsWith: PREFIX } },
    data: { isOnline: false, isAvailable: true, queueJoinedAt: null, timeoutCount: 0 },
  });
  for (const n of names) await q.goOnline(id(n)); // เรียงตามลำดับที่ส่งมา
}

// ลำดับคิวเฉพาะคนขับทดสอบ (เรียงด้วย queueJoinedAt เหมือนที่ระบบใช้จริง)
async function order() {
  const rows = await prisma.driver.findMany({
    where: { phone: { startsWith: PREFIX }, isOnline: true, isAvailable: true, queueJoinedAt: { not: null } },
    orderBy: [{ queueJoinedAt: "asc" }, { id: "asc" }],
  });
  return rows.map((r) => nameOf(r.id)).join("");
}

let userSeq = 0;
async function mkRequest() {
  const user = await prisma.user.create({
    data: { fullName: "T-user", phone: `${PREFIX}U${++userSeq}`, email: `t${userSeq}-${Date.now()}@ku.th`, passwordHash: "x" },
  });
  const r = await prisma.serviceRequest.create({
    data: { userId: user.id, pickupLat: 14, pickupLng: 99, destinationLat: 14.1, destinationLng: 99.1, fare: 20 },
  });
  return q.dispatchRequest(r.id, null);
}
const expire = (reqId) =>
  prisma.serviceRequest.update({ where: { id: reqId }, data: { offerExpiresAt: new Date(Date.now() - 1000) } });
const fresh = (n) => prisma.driver.findUnique({ where: { id: id(n) } });

async function main() {
  const saved = await prisma.driver.findMany({
    where: { NOT: { phone: { startsWith: PREFIX } } },
    select: { id: true, isOnline: true, isAvailable: true, queueJoinedAt: true, timeoutCount: true },
  });
  await prisma.driver.updateMany({ where: { NOT: { phone: { startsWith: PREFIX } } }, data: { isOnline: false } });
  for (const n of "ABCDEFGH") await mkDriver(n);

  try {
    console.log("\nลำดับคิว / accept / reject / timeout");
    await test("คิวเรียง FIFO ตามเวลากดออนไลน์ และเสนองานให้หัวคิวก่อน", async () => {
      await resetQueue("ABCDE");
      assert.equal(await order(), "ABCDE");
      const r = await mkRequest();
      assert.equal(r.offeredDriverId, id("A"));
      assert.ok(r.offerExpiresAt.getTime() - Date.now() <= q.OFFER_TIMEOUT_MS);
    });

    await test("reject: ไปท้ายคิวทันที + ส่งต่อคนถัดไปทันที", async () => {
      await resetQueue("ABCDE");
      await mkRequest();
      const next = await q.handleDriverResponse(id("A"), "reject", null);
      assert.equal(next.offeredDriverId, id("B"));
      assert.equal(await order(), "BCDEA");
    });

    await test("timeout ครั้งแรก: timeoutCount+1, ส่งต่อทันที, คนได้งานออกจากคิว, คนที่ timeout ยังอยู่หน้าคิว (ไม่ไปท้าย)", async () => {
      await resetQueue("ABCDE");
      const r = await mkRequest();
      await expire(r.id);
      const next = await q.handleDriverResponse(id("A"), "timeout", null);
      assert.equal(next.offeredDriverId, id("B"));
      assert.equal((await fresh("A")).timeoutCount, 1);
      const acc = await q.handleDriverResponse(id("B"), "accept", null);
      assert.equal(acc.status, "ACCEPTED");
      const b = await fresh("B");
      assert.equal(b.isAvailable, false);
      assert.equal(b.queueJoinedAt, null);
      assert.equal(b.timeoutCount, 0);
      assert.equal(await order(), "ACDE"); // A ต่อจาก B (ที่ออกไปแล้ว) = ยังอยู่หัวคิว ไม่ไปท้าย
    });

    await test("settleTimedOutDrivers: แทรกคนที่ timeout ไว้ 'ต่อจาก' คนได้งานโดยไม่ขยับคนอื่น", async () => {
      await resetQueue("ABCD");
      await prisma.$transaction((tx) => q.settleTimedOutDrivers(tx, id("A"), [id("D")]));
      assert.equal(await order(), "ADBC");
      await prisma.$transaction((tx) => q.settleTimedOutDrivers(tx, id("A"), [id("C"), id("B")]));
      assert.equal(await order(), "ACBD");
    });

    await test("timeout ครบ 3 ครั้ง: ออฟไลน์อัตโนมัติ + ออกจากคิว + ส่ง event + ส่งต่อคนถัดไป", async () => {
      await resetQueue("AB");
      const emitted = [];
      const io = { to: (room) => ({ emit: (ev) => emitted.push(`${room}:${ev}`) }) };
      for (let i = 1; i <= 3; i++) {
        const r = await mkRequest();
        assert.equal(r.offeredDriverId, id("A"), `รอบ ${i} ต้องเสนอ A ก่อน`);
        await expire(r.id);
        const next = await q.handleDriverResponse(id("A"), "timeout", io);
        assert.equal(next.offeredDriverId, id("B"));
        await q.handleDriverResponse(id("B"), "accept", null);
        await q.handleTripCompleted(id("B"));
      }
      const a = await fresh("A");
      assert.equal(a.isOnline, false);
      assert.equal(a.queueJoinedAt, null);
      assert.equal(a.timeoutCount, 3);
      assert.ok(emitted.includes(`driver:${id("A")}:driver:forced-offline`));
      assert.equal(await order(), "B");
    });

    await test("accept รีเซ็ต timeoutCount ที่สะสมไว้", async () => {
      await resetQueue("AB");
      await prisma.driver.update({ where: { id: id("A") }, data: { timeoutCount: 2 } });
      await mkRequest();
      await q.handleDriverResponse(id("A"), "accept", null);
      assert.equal((await fresh("A")).timeoutCount, 0);
    });

    await test("ไม่มีคนขับเหลือ → คำขอถูกยกเลิก (ไม่ค้าง)", async () => {
      await resetQueue("A");
      await mkRequest();
      const res = await q.handleDriverResponse(id("A"), "reject", null);
      assert.equal(res.status, "CANCELLED");
    });

    console.log("\nจบทริป / ออนไลน์-ออฟไลน์");
    await test("จบทริป: ยังออนไลน์ → ท้ายคิว, available, timeoutCount=0", async () => {
      await resetQueue("ABC");
      await mkRequest();
      await q.handleDriverResponse(id("A"), "accept", null);
      assert.equal(await order(), "BC");
      await q.handleTripCompleted(id("A"));
      assert.equal(await order(), "BCA");
      const a = await fresh("A");
      assert.equal(a.isAvailable, true);
      assert.equal(a.timeoutCount, 0);
    });

    await test("จบทริป: ปิดแอปกลางทริป (ออฟไลน์) → ไม่เข้าคิว; กดออนไลน์ใหม่ค่อยเข้าท้ายคิว", async () => {
      await resetQueue("ABC");
      const r = await mkRequest();
      await q.handleDriverResponse(id("A"), "accept", null);
      await q.goOffline(id("A"), null);
      await prisma.serviceRequest.update({ where: { id: r.id }, data: { status: "COMPLETED" } }); // เหมือน completeRequest จริง
      await q.handleTripCompleted(id("A"));
      assert.equal(await order(), "BC");
      await q.goOnline(id("A"));
      assert.equal(await order(), "BCA");
    });

    await test("กดออนไลน์กลางทริปไม่ทำให้ถูกเสนองานซ้อน; เข้าคิวเมื่อจบทริป", async () => {
      await resetQueue("AB");
      await mkRequest();
      await q.handleDriverResponse(id("A"), "accept", null);
      await q.goOffline(id("A"), null);
      await q.goOnline(id("A"));
      const a = await fresh("A");
      assert.equal(a.isOnline, true);
      assert.equal(a.isAvailable, false);
      assert.equal(a.queueJoinedAt, null);
      await q.handleTripCompleted(id("A"));
      assert.equal(await order(), "BA");
    });

    await test("ออฟไลน์ตอนกำลังถูกเสนองาน → ส่งต่อคนถัดไปทันที ไม่นับเป็นความผิด", async () => {
      await resetQueue("ABC");
      const r = await mkRequest();
      await q.goOffline(id("A"), null);
      const cur = await prisma.serviceRequest.findUnique({ where: { id: r.id } });
      assert.equal(cur.offeredDriverId, id("B"));
      assert.equal((await fresh("A")).timeoutCount, 0);
    });

    console.log("\nRace conditions");
    await test("5 คำขอพร้อมกัน / 5 คนขับ: ได้คนละคน ไม่มีใครถูกเสนองานซ้อน", async () => {
      await resetQueue("ABCDE");
      const results = await Promise.all(Array.from({ length: 5 }, () => mkRequest()));
      const offered = results.map((r) => r.offeredDriverId);
      assert.ok(offered.every(Boolean), `ทุกคำขอต้องได้คนขับ: ${offered}`);
      assert.equal(new Set(offered).size, 5);
    });

    await test("8 คำขอพร้อมกัน / 3 คนขับ: 3 คำขอได้คนขับคนละคน ที่เหลือถูกยกเลิก (ไม่ซ้อน ไม่ค้าง)", async () => {
      await resetQueue("ABC");
      const results = await Promise.all(Array.from({ length: 8 }, () => mkRequest()));
      const offered = results.filter((r) => r.status === "PENDING").map((r) => r.offeredDriverId);
      assert.equal(offered.length, 3);
      assert.equal(new Set(offered).size, 3);
      assert.equal(results.filter((r) => r.status === "CANCELLED").length, 5);
    });

    await test("accept กับ reject จากคนขับคนเดียวพร้อมกัน: สำเร็จได้แค่อย่างเดียว", async () => {
      await resetQueue("ABC");
      await mkRequest();
      const res = await Promise.allSettled([
        q.handleDriverResponse(id("A"), "accept", null),
        q.handleDriverResponse(id("A"), "reject", null),
      ]);
      assert.equal(res.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(res.filter((r) => r.status === "rejected").length, 1);
    });

    await test("accept กับ timeout (sweeper) ชนกันตอนหมดเวลา: ส่งต่อได้ครั้งเดียว ไม่นับ timeout ซ้ำ", async () => {
      await resetQueue("ABC");
      const r = await mkRequest();
      await expire(r.id);
      const res = await Promise.allSettled([
        q.handleDriverResponse(id("A"), "accept", null),
        q.handleDriverResponse(id("A"), "timeout", null),
        q.handleDriverResponse(id("A"), "timeout", null),
      ]);
      const cur = await prisma.serviceRequest.findUnique({ where: { id: r.id } });
      assert.equal(cur.status, "PENDING");
      assert.equal(cur.offeredDriverId, id("B"));
      assert.equal(cur.triedDriverIds.filter((x) => x === id("A")).length, 1);
      assert.equal((await fresh("A")).timeoutCount, 1);
      assert.equal(res[0].status, "rejected"); // accept หลังหมดเวลาต้องไม่ผ่าน
    });

    await test("คนที่ไม่ได้ถูกเสนองานกด accept ไม่ได้", async () => {
      await resetQueue("ABC");
      const r = await mkRequest();
      await assert.rejects(q.handleDriverResponse(id("B"), "accept", null, { requestId: r.id }), /ไม่ใช่คิวของคุณ/);
    });

    await test("จบทริป/กดออนไลน์ซ้ำพร้อมกัน: เข้าคิวครั้งเดียว ตำแหน่งไม่ถูกรีเซ็ต", async () => {
      await resetQueue("ABC");
      await mkRequest();
      await q.handleDriverResponse(id("A"), "accept", null);
      await Promise.all(Array.from({ length: 5 }, () => q.handleTripCompleted(id("A"))));
      assert.equal(await order(), "BCA");
      const t1 = (await fresh("A")).queueJoinedAt.getTime();
      await Promise.all(Array.from({ length: 5 }, () => q.goOnline(id("A"))));
      assert.equal((await fresh("A")).queueJoinedAt.getTime(), t1);
    });
  } finally {
    const ids = Object.values(drivers).map((d) => d.id);
    await prisma.serviceRequest.deleteMany({ where: { user: { phone: { startsWith: PREFIX } } } });
    await prisma.notification.deleteMany({ where: { recipientId: { in: ids } } });
    await prisma.user.deleteMany({ where: { phone: { startsWith: PREFIX } } });
    await prisma.driver.deleteMany({ where: { phone: { startsWith: PREFIX } } });
    for (const d of saved) {
      await prisma.driver.update({
        where: { id: d.id },
        data: { isOnline: d.isOnline, isAvailable: d.isAvailable, queueJoinedAt: d.queueJoinedAt, timeoutCount: d.timeoutCount },
      });
    }
    await prisma.$disconnect();
    console.log(`\n${passed} tests passed${process.exitCode ? " (มีบางข้อล้มเหลว)" : ""}`);
  }
}
main();
