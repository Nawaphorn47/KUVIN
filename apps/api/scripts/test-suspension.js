// ทดสอบการจัดการผู้ใช้/คนขับและการระงับบัญชีผ่าน HTTP + socket จริง — รัน: npm run test:suspension (ต้องเปิด API ไว้ที่ :4000)
// สร้างบัญชีชั่วคราว (prefix 0998TEST) แล้วลบทิ้งตอนจบ; สถานะออนไลน์ของคนขับจริงจะถูกเก็บไว้แล้วคืนให้
require("dotenv").config();
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { io: connect } = require("socket.io-client");
const prisma = require("../src/config/prisma");
const q = require("../src/services/queue.service");

const B = `http://localhost:${process.env.PORT || 4000}/api`;
const PREFIX = "0998TEST";
let passed = 0;

async function call(method, path, token, body) {
  const r = await fetch(B + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const text = await r.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // ไม่ใช่ JSON
  }
  return { status: r.status, body: json };
}

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const passwordHash = await bcrypt.hash("test1234", 4);
  const saved = await prisma.driver.findMany({
    where: { NOT: { phone: { startsWith: PREFIX } } },
    select: { id: true, isOnline: true, isAvailable: true, queueJoinedAt: true, timeoutCount: true },
  });
  await prisma.driver.updateMany({ where: { NOT: { phone: { startsWith: PREFIX } } }, data: { isOnline: false } });

  const user = await prisma.user.create({
    data: { fullName: "T-user", phone: `${PREFIX}U1`, email: `susp-u1-${Date.now()}@ku.th`, passwordHash },
  });
  const user2 = await prisma.user.create({
    data: { fullName: "T-user2", phone: `${PREFIX}U2`, email: `susp-u2-${Date.now()}@ku.th`, passwordHash },
  });
  const mkDriver = (n) =>
    prisma.driver.create({
      data: { fullName: `T-drv${n}`, phone: `${PREFIX}D${n}`, passwordHash, vinNumber: `S${n}${Date.now() % 100000}`, licensePlate: "T", verificationStatus: "APPROVED" },
    });
  const [d1, d2] = [await mkDriver(1), await mkDriver(2)];

  const admin = (await call("POST", "/auth/admin/login", null, { email: "admin@ku.th", password: "admin1234" })).body;
  const userLogin = (email) => call("POST", "/auth/user/login", null, { email, password: "test1234" });
  const driverLogin = (phone) => call("POST", "/auth/driver/login", null, { phone, password: "test1234" });
  const A = admin.token;

  try {
    console.log("\nรายการ / รายละเอียด");
    await test("รายการผู้ใช้ค้นหาด้วยชื่อ/เบอร์ได้ และไม่ส่ง passwordHash", async () => {
      const r = await call("GET", `/admin/users?q=${PREFIX}U`, A);
      assert.equal(r.status, 200);
      assert.equal(r.body.length, 2);
      assert.ok(r.body.every((u) => u.passwordHash === undefined && u.tripCount === 0));
    });

    await test("รายการคนขับกรองตามสถานะ (ออนไลน์/ระงับ/ผ่านการยืนยัน) ได้", async () => {
      const all = await call("GET", `/admin/drivers?q=${PREFIX}D`, A);
      assert.equal(all.body.length, 2);
      assert.equal((await call("GET", `/admin/drivers?q=${PREFIX}D&status=online`, A)).body.length, 0);
      assert.equal((await call("GET", `/admin/drivers?q=${PREFIX}D&status=APPROVED`, A)).body.length, 2);
      assert.equal((await call("GET", `/admin/drivers?q=${PREFIX}D&status=suspended`, A)).body.length, 0);
    });

    await test("รายละเอียดมีสถิติและประวัติทริป; id ไม่มีจริงได้ 404", async () => {
      const r = await call("GET", `/admin/users/${user.id}`, A);
      assert.equal(r.status, 200);
      assert.equal(r.body.stats.totalTrips, 0);
      assert.deepEqual(r.body.trips, []);
      assert.equal((await call("GET", "/admin/drivers/no-such-id", A)).status, 404);
    });

    await test("สิทธิ์: ผู้โดยสารเรียก endpoint admin ไม่ได้", async () => {
      const t = (await userLogin(user.email)).body.token;
      assert.equal((await call("GET", "/admin/users", t)).status, 403);
    });

    console.log("\nระงับผู้ใช้");
    await test("ระงับโดยไม่ใส่เหตุผลไม่ได้", async () => {
      assert.equal((await call("POST", `/admin/users/${user.id}/suspend`, A, { reason: "  " })).status, 400);
    });

    await test("ระงับผู้ใช้: token เดิมใช้ต่อไม่ได้ทันที (403 ACCOUNT_SUSPENDED) และ login ไม่ได้", async () => {
      const t = (await userLogin(user.email)).body.token;
      assert.equal((await call("GET", "/auth/me", t)).status, 200); // ปกติก่อน (ทำให้ cache ว่าไม่ถูกระงับ)

      const s = await call("POST", `/admin/users/${user.id}/suspend`, A, { reason: "ทดสอบระบบ" });
      assert.equal(s.status, 200);
      assert.equal(s.body.isSuspended, true);

      const me = await call("GET", "/auth/me", t);
      assert.equal(me.status, 403);
      assert.equal(me.body.code, "ACCOUNT_SUSPENDED");
      assert.match(me.body.error, /ทดสอบระบบ/);

      const login = await userLogin(user.email);
      assert.equal(login.status, 403);
      assert.equal(login.body.code, "ACCOUNT_SUSPENDED");
      // รหัสผ่านผิดต้องไม่เปิดเผยว่าบัญชีถูกระงับ
      const wrong = await call("POST", "/auth/user/login", null, { email: user.email, password: "wrong" });
      assert.equal(wrong.status, 401);
    });

    await test("ระงับซ้ำได้ 409; ปลดระงับแล้วใช้งานได้ทันที; ปลดซ้ำได้ 409", async () => {
      assert.equal((await call("POST", `/admin/users/${user.id}/suspend`, A, { reason: "x" })).status, 409);
      assert.equal((await call("POST", `/admin/users/${user.id}/unsuspend`, A)).status, 200);
      assert.equal((await userLogin(user.email)).status, 200);
      assert.equal((await call("POST", `/admin/users/${user.id}/unsuspend`, A)).status, 409);
    });

    await test("ผู้ใช้ที่กำลังมีทริปวิ่งอยู่ระงับไม่ได้ (409)", async () => {
      await q.goOnline(d1.id);
      const r = await prisma.serviceRequest.create({
        data: { userId: user.id, driverId: d1.id, status: "IN_PROGRESS", pickupLat: 14, pickupLng: 99, destinationLat: 14.1, destinationLng: 99.1, fare: 20 },
      });
      const s = await call("POST", `/admin/users/${user.id}/suspend`, A, { reason: "x" });
      assert.equal(s.status, 409);
      assert.match(s.body.error, /ทริป/);
      await prisma.serviceRequest.update({ where: { id: r.id }, data: { status: "COMPLETED" } });
      await q.goOffline(d1.id, null);
    });

    await test("ผู้ใช้ที่มีคำขอ PENDING: ระงับแล้วคำขอถูกยกเลิกให้อัตโนมัติ", async () => {
      const r = await prisma.serviceRequest.create({
        data: { userId: user2.id, status: "PENDING", pickupLat: 14, pickupLng: 99, destinationLat: 14.1, destinationLng: 99.1, fare: 20 },
      });
      assert.equal((await call("POST", `/admin/users/${user2.id}/suspend`, A, { reason: "ทดสอบ" })).status, 200);
      const cur = await prisma.serviceRequest.findUnique({ where: { id: r.id } });
      assert.equal(cur.status, "CANCELLED");
      await call("POST", `/admin/users/${user2.id}/unsuspend`, A);
    });

    console.log("\nระงับคนขับ");
    await test("ระงับคนขับที่ออนไลน์: ออกจากคิว + ตัด socket + token ใช้ไม่ได้ + login ไม่ได้", async () => {
      await q.goOnline(d1.id);
      const t = (await driverLogin(d1.phone)).body.token;
      const events = [];
      const sock = connect(`http://localhost:${process.env.PORT || 4000}`, { auth: { token: t }, reconnection: false });
      await new Promise((res, rej) => {
        sock.on("connect", res);
        sock.on("connect_error", rej);
      });
      sock.on("account:suspended", (e) => events.push(e));
      sock.emit("driver:online");
      await sleep(300);
      let disconnected = false;
      sock.on("disconnect", () => (disconnected = true));

      const s = await call("POST", `/admin/drivers/${d1.id}/suspend`, A, { reason: "ร้องเรียนจากผู้โดยสาร" });
      assert.equal(s.status, 200);
      await sleep(400);

      const drv = await prisma.driver.findUnique({ where: { id: d1.id } });
      assert.equal(drv.isOnline, false);
      assert.equal(drv.queueJoinedAt, null);
      assert.equal(events.length, 1);
      assert.match(events[0].reason, /ร้องเรียน/);
      assert.ok(disconnected, "socket ต้องถูกตัด");

      assert.equal((await call("PATCH", "/drivers/me/availability", t, { isOnline: true })).status, 403);
      assert.equal((await driverLogin(d1.phone)).status, 403);

      // socket ใหม่ด้วย token เดิมก็ต้องต่อไม่ได้
      const again = connect(`http://localhost:${process.env.PORT || 4000}`, { auth: { token: t }, reconnection: false });
      const err = await new Promise((res) => again.on("connect_error", res));
      assert.equal(err.message, "suspended");
      again.close();
    });

    await test("ระงับคนขับที่กำลังถูกเสนองาน: งานส่งต่อให้คนถัดไปทันที", async () => {
      await prisma.driver.update({ where: { id: d1.id }, data: { isSuspended: false } });
      await call("POST", `/admin/drivers/${d1.id}/unsuspend`, A).catch(() => {});
      await q.goOnline(d1.id);
      await q.goOnline(d2.id);
      const r = await prisma.serviceRequest.create({
        data: { userId: user.id, pickupLat: 14, pickupLng: 99, destinationLat: 14.1, destinationLng: 99.1, fare: 20 },
      });
      const offered = await q.dispatchRequest(r.id, null);
      assert.equal(offered.offeredDriverId, d1.id);

      assert.equal((await call("POST", `/admin/drivers/${d1.id}/suspend`, A, { reason: "ทดสอบ" })).status, 200);
      const cur = await prisma.serviceRequest.findUnique({ where: { id: r.id } });
      assert.equal(cur.offeredDriverId, d2.id);
      await prisma.serviceRequest.delete({ where: { id: r.id } });
    });

    await test("ปลดระงับคนขับแล้ว login ได้ (ต้องกดออนไลน์เองอีกครั้ง)", async () => {
      assert.equal((await call("POST", `/admin/drivers/${d1.id}/unsuspend`, A)).status, 200);
      const l = await driverLogin(d1.phone);
      assert.equal(l.status, 200);
      const drv = await prisma.driver.findUnique({ where: { id: d1.id } });
      assert.equal(drv.isOnline, false);
    });
  } finally {
    const ids = [d1.id, d2.id];
    await prisma.serviceRequest.deleteMany({ where: { userId: { in: [user.id, user2.id] } } });
    await prisma.notification.deleteMany({ where: { recipientId: { in: [...ids, user.id, user2.id] } } });
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
