// ทดสอบการตรวจสลิปโอนเงิน — ส่วนแรกเป็น unit test ล้วน ส่วนหลังยิง HTTP จริงกับ API ที่เปิดอยู่ (ใช้ตัวจำลองสลิป
// SLIP_PROVIDER=mock ซึ่งเป็นค่าเริ่มต้นตอน dev) รัน: npm run test:payment
// สร้างข้อมูลชั่วคราว (prefix 0997TEST) แล้วลบทิ้งตอนจบ
require("dotenv").config();
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");
const { matchReceiver } = require("../src/services/slip/receiver");
const { evaluateSlip } = require("../src/services/payment.service");
const slipok = require("../src/services/slip/slipok.provider");
const easyslip = require("../src/services/slip/easyslip.provider");
const { SlipError } = require("../src/services/slip/errors");

const B = `http://localhost:${process.env.PORT || 4000}/api`;
const PREFIX = "0997TEST";
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

async function call(method, path, token, body) {
  const r = await fetch(B + path, {
    method,
    headers: { ...(body && { "Content-Type": "application/json" }), ...(token && { Authorization: `Bearer ${token}` }) },
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

// อัปโหลดสลิป (ตัวจำลองอ่านผลจากชื่อไฟล์)
async function upload(requestId, token, filename, { type = "image/png" } = {}) {
  const form = new FormData();
  form.append("file", new Blob([Buffer.from("fake-image-bytes")], { type }), filename);
  const r = await fetch(`${B}/service-requests/${requestId}/payment-slip`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function main() {
  // เผื่อรันครั้งก่อนพังกลางคันแล้วไม่ได้ลบข้อมูลทดสอบทิ้ง (เช่น phone ชนกันจนสร้างไม่ได้ทุกรอบถัดไป)
  await prisma.serviceRequest.deleteMany({ where: { user: { phone: { startsWith: PREFIX } } } });
  await prisma.user.deleteMany({ where: { phone: { startsWith: PREFIX } } });
  await prisma.driver.deleteMany({ where: { phone: { startsWith: PREFIX } } });

  // ---------------- unit ----------------
  console.log("\nเทียบผู้รับเงิน (receiver)");
  const ID = "0812345678";
  await test("เลขปิดบังที่เห็นท้าย 4 หลักตรงกัน = MATCH", () => assert.equal(matchReceiver(ID, ["xxx-xxx-5678"]), "MATCH"));
  await test("เลขท้ายไม่ตรง = MISMATCH", () => assert.equal(matchReceiver(ID, ["xxx-xxx-0000"]), "MISMATCH"));
  await test("รูปแบบ +66 ตรงกับเบอร์ 0xxxxxxxxx", () => assert.equal(matchReceiver(ID, ["+66812345678"]), "MATCH"));
  await test("เห็นเลขไม่ถึง 4 หลัก / ไม่มีเลขเลย / มีแต่ชื่อ = UNKNOWN (ห้ามยืนยันอัตโนมัติ)", () => {
    assert.equal(matchReceiver(ID, ["xxxxxxxx78"]), "UNKNOWN");
    assert.equal(matchReceiver(ID, []), "UNKNOWN");
    assert.equal(matchReceiver(ID, ["นาย สมชาย ใจดี"]), "UNKNOWN");
  });
  await test("ค่าหนึ่งตรงและอีกค่า (เลขบัญชีธนาคารที่ผูกกับพร้อมเพย์) ไม่ตรง = MATCH", () =>
    assert.equal(matchReceiver(ID, ["xxx-x-x9999-x", "xxx-xxx-5678"]), "MATCH"));
  await test("เลขบัตรประชาชน 13 หลักที่ปิดบังไว้ก็เทียบได้", () => {
    assert.equal(matchReceiver("1234567890123", ["x-xxxx-xxxxx-01-23"]), "MATCH");
    assert.equal(matchReceiver("1234567890123", ["x-xxxx-xxxxx-99-99"]), "MISMATCH");
  });

  console.log("\nตรวจสลิปเทียบกับทริป (evaluateSlip)");
  const notBefore = new Date("2026-09-25T10:00:00+07:00");
  const good = { amount: 20, sentAt: new Date("2026-09-25T10:20:00+07:00"), receiverHints: ["xxx-xxx-5678"] };
  const ctx = { fare: 20, promptPayId: ID, notBefore, now: new Date("2026-09-25T10:25:00+07:00") };
  await test("สลิปถูกต้องผ่าน", () => assert.equal(evaluateSlip(good, ctx).ok, true));
  await test("ยอดไม่ตรง บอกทั้งสองยอด", () => {
    const r = evaluateSlip({ ...good, amount: 25 }, ctx);
    assert.equal(r.code, "AMOUNT_MISMATCH");
    assert.match(r.message, /25.*20/);
  });
  await test("ผู้รับผิด / ตรวจผู้รับไม่ได้ ไม่ผ่านคนละรหัส", () => {
    assert.equal(evaluateSlip({ ...good, receiverHints: ["xxx-xxx-0000"] }, ctx).code, "RECEIVER_MISMATCH");
    assert.equal(evaluateSlip({ ...good, receiverHints: [] }, ctx).code, "RECEIVER_UNVERIFIABLE");
  });
  await test("สลิปก่อนเริ่มทริป/เวลาอยู่ในอนาคต ไม่ผ่าน; เหลื่อมไม่เกิน 5 นาทีผ่าน", () => {
    assert.equal(evaluateSlip({ ...good, sentAt: new Date("2026-09-25T09:00:00+07:00") }, ctx).code, "SLIP_TOO_OLD");
    assert.equal(evaluateSlip({ ...good, sentAt: new Date("2026-09-25T10:40:00+07:00") }, ctx).code, "SLIP_IN_FUTURE");
    assert.equal(evaluateSlip({ ...good, sentAt: new Date("2026-09-25T09:57:00+07:00") }, ctx).ok, true);
  });

  console.log("\nตัวเชื่อม SlipOK (fetch จำลอง)");
  const mkProvider = (impl) => slipok.createProvider({ apiKey: "k", branchId: "b", fetchImpl: impl });
  const jsonRes = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });
  const file = { buffer: Buffer.from("x"), mimeType: "image/png", filename: "s.png" };
  await test("อ่านผลสำเร็จ: เลขอ้างอิง ยอด เวลาไทย (transDate/transTime) และข้อมูลผู้รับ", async () => {
    const p = mkProvider(
      jsonRes(200, {
        success: true,
        data: {
          success: true,
          transRef: "REF1",
          sendingBank: "004",
          transDate: "20260925",
          transTime: "10:20:30",
          amount: 20,
          receiver: { proxy: { type: "MSISDN", value: "xxx-xxx-5678" }, account: { value: "xxx-x-x1234-x" } },
        },
      })
    );
    const r = await p.verify(file);
    assert.equal(r.ref, "REF1");
    assert.equal(r.amount, 20);
    assert.equal(r.sentAt.toISOString(), "2026-09-25T03:20:30.000Z"); // 10:20:30 +07:00
    assert.ok(r.receiverHints.includes("xxx-xxx-5678"));
  });
  await test("ใช้ transTimestamp (UTC, ฟิลด์บังคับตามเอกสาร) เป็นหลัก ไม่ต้องพึ่ง transDate/transTime", async () => {
    const p = mkProvider(
      jsonRes(200, {
        success: true,
        data: { success: true, transRef: "REF2", sendingBank: "004", transTimestamp: "2026-09-25T03:20:30.000Z", amount: 20, receiver: {} },
      })
    );
    const r = await p.verify(file);
    assert.equal(r.sentAt.toISOString(), "2026-09-25T03:20:30.000Z");
  });
  await test("ข้อมูลไม่ครบ = SLIP_UNREADABLE (ไม่เดาค่า)", async () => {
    const p = mkProvider(jsonRes(200, { success: true, data: { transRef: "R" } }));
    await assert.rejects(p.verify(file), (e) => e instanceof SlipError && e.code === "SLIP_UNREADABLE");
  });
  await test("แยกประเภทข้อผิดพลาด: ไม่ใช่สลิป / เซิร์ฟเวอร์ล่ม / key ผิด / เครือข่ายล่ม", async () => {
    await assert.rejects(mkProvider(jsonRes(400, { code: 1007, message: "x" })).verify(file), (e) => e.code === "NOT_A_SLIP");
    await assert.rejects(mkProvider(jsonRes(500, {})).verify(file), (e) => e.code === "PROVIDER_UNAVAILABLE");
    await assert.rejects(mkProvider(jsonRes(401, {})).verify(file), (e) => e.code === "PROVIDER_UNAVAILABLE");
    await assert.rejects(
      mkProvider(async () => {
        throw new Error("ECONNRESET");
      }).verify(file),
      (e) => e.code === "PROVIDER_UNAVAILABLE"
    );
  });
  await test("แพ็กเกจ/โควตาของบัญชี SlipOK หมด (1003/1004/1015) ไม่ใช่ความผิดผู้โดยสาร", async () => {
    for (const code of [1003, 1004, 1015]) {
      await assert.rejects(mkProvider(jsonRes(400, { code, message: "x" })).verify(file), (e) => e.code === "PROVIDER_UNAVAILABLE", `code ${code}`);
    }
  });
  await test("1010 (ธนาคารต้องรอก่อนตรวจซ้ำ) บอกจำนวนนาทีจาก data.delay ถ้ามี", async () => {
    const e1 = await mkProvider(jsonRes(400, { code: 1010, message: "x", data: { delay: 8 } })).verify(file).catch((e) => e);
    assert.equal(e1.code, "SLIP_NOT_READY");
    assert.match(e1.message, /8 นาที/);
    const e2 = await mkProvider(jsonRes(400, { code: 1010, message: "x" })).verify(file).catch((e) => e);
    assert.equal(e2.code, "SLIP_NOT_READY");
  });

  console.log("\nตัวเชื่อม EasySlip (fetch จำลอง)");
  const mkEasy = (impl) => easyslip.createProvider({ apiKey: "k", fetchImpl: impl });
  await test("อ่านผลสำเร็จ: เลขอ้างอิง ยอด (rawSlip.amount.amount) เวลา ISO และข้อมูลผู้รับ", async () => {
    const p = mkEasy(
      jsonRes(200, {
        success: true,
        data: {
          isDuplicate: false,
          rawSlip: {
            transRef: "68370160657749I376388B35",
            date: "2026-09-25T10:20:30+07:00",
            amount: { amount: 20 },
            sender: { bank: { id: "004", name: "กสิกรไทย", short: "KBANK" }, account: { name: { th: "x" } } },
            receiver: {
              bank: { id: "014", name: "ไทยพาณิชย์", short: "SCB" },
              account: { name: { th: "y" }, proxy: { type: "MSISDN", account: "xxx-xxx-5678" } },
            },
          },
        },
        message: "ok",
      })
    );
    const r = await p.verify(file);
    assert.equal(r.ref, "68370160657749I376388B35");
    assert.equal(r.bank, "KBANK");
    assert.equal(r.amount, 20);
    assert.equal(r.sentAt.toISOString(), "2026-09-25T03:20:30.000Z");
    assert.ok(r.receiverHints.includes("xxx-xxx-5678"));
  });
  await test("ข้อมูลไม่ครบ = SLIP_UNREADABLE (ไม่เดาค่า)", async () => {
    const p = mkEasy(jsonRes(200, { success: true, data: { rawSlip: { transRef: "R" } } }));
    await assert.rejects(p.verify(file), (e) => e instanceof SlipError && e.code === "SLIP_UNREADABLE");
  });
  await test("แยกประเภทข้อผิดพลาดตามรูปแบบ { success:false, error:{code,message} }", async () => {
    const err = (status, code) => mkEasy(jsonRes(status, { success: false, error: { code, message: "x" } })).verify(file);
    await assert.rejects(err(404, "SLIP_NOT_FOUND"), (e) => e.code === "NOT_A_SLIP");
    await assert.rejects(err(400, "INVALID_IMAGE_FORMAT"), (e) => e.code === "NOT_A_SLIP");
    await assert.rejects(err(400, "IMAGE_SIZE_TOO_LARGE"), (e) => e.code === "NOT_A_SLIP");
    await assert.rejects(err(404, "SLIP_PENDING"), (e) => e.code === "SLIP_NOT_READY");
    await assert.rejects(err(401, "MISSING_API_KEY"), (e) => e.code === "PROVIDER_UNAVAILABLE");
    await assert.rejects(err(403, "QUOTA_EXCEEDED"), (e) => e.code === "PROVIDER_UNAVAILABLE");
    await assert.rejects(err(429, "RATE_LIMIT_EXCEEDED"), (e) => e.code === "PROVIDER_UNAVAILABLE");
    await assert.rejects(err(500, "API_SERVER_ERROR"), (e) => e.code === "PROVIDER_UNAVAILABLE");
    // โค้ด 400 ที่ไม่ควรเกิดจากคำขอของเรา (ผิดรูปแบบคำขอเอง ไม่ใช่ของผู้โดยสาร) → ไม่นับเป็นความพยายาม
    await assert.rejects(err(400, "VALIDATION_ERROR"), (e) => e.code === "PROVIDER_UNAVAILABLE");
    await assert.rejects(
      mkEasy(async () => {
        throw new Error("ECONNRESET");
      }).verify(file),
      (e) => e.code === "PROVIDER_UNAVAILABLE"
    );
  });

  // ---------------- integration ----------------
  // ตั้งแต่บรรทัดนี้เริ่มสร้างข้อมูลจริงในฐานข้อมูล ต้องอยู่ใน try เพื่อให้ finally ลบทิ้งได้เสมอแม้ setup เองจะพัง
  try {
    const passwordHash = await bcrypt.hash("test1234", 4);
    const mkUser = (n) =>
      prisma.user.create({ data: { fullName: `P-user${n}`, phone: `${PREFIX}U${n}`, email: `pay-u${n}-${Date.now()}@ku.th`, passwordHash } });
    const mkDriver = (n, promptPayId) =>
      prisma.driver.create({
        data: { fullName: `P-drv${n}`, phone: `${PREFIX}D${n}`, passwordHash, vinNumber: `P${n}${Date.now() % 100000}`, licensePlate: "T", verificationStatus: "APPROVED", promptPayId },
      });
    const mkTrip = (user, driver, overrides = {}) =>
      prisma.serviceRequest.create({
        data: {
          userId: user.id, driverId: driver?.id, status: "COMPLETED", fare: 20, pickupLat: 14, pickupLng: 99, destinationLat: 14.1, destinationLng: 99.1,
          acceptedAt: new Date(Date.now() - 20 * 60 * 1000), completedAt: new Date(), ...overrides,
        },
      });
    const login = async (kind, who) =>
      (kind === "user"
        ? await call("POST", "/auth/user/login", null, { email: who.email, password: "test1234" })
        : await call("POST", "/auth/driver/login", null, { phone: who.phone, password: "test1234" })).body.token;

    const u1 = await mkUser(1);
    const u2 = await mkUser(2);
    const d1 = await mkDriver(1, ID);
    const d2 = await mkDriver(2, null);
    const [tu1, tu2, td1] = [await login("user", u1), await login("user", u2), await login("driver", d1)];

    console.log("\nอัปโหลดสลิป (ผ่าน HTTP)");
    await test("สลิปถูกต้อง: จ่ายแล้วอัตโนมัติ (PROMPTPAY/SLIP) + แจ้งคนขับ; ส่งซ้ำได้ 409", async () => {
      const t = await mkTrip(u1, d1);
      const r = await upload(t.id, tu1, "ok.png");
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.verified, true);
      const cur = await prisma.serviceRequest.findUnique({ where: { id: t.id } });
      assert.equal(cur.paymentStatus, "PAID");
      assert.equal(cur.paymentMethod, "PROMPTPAY");
      assert.equal(cur.paymentConfirmedBy, "SLIP");
      assert.ok(cur.paymentRef && cur.paymentVerifiedAt);
      const notes = await prisma.notification.findMany({ where: { recipientId: d1.id } });
      assert.ok(notes.some((n) => n.title === "ได้รับชำระเงินแล้ว"));
      assert.equal((await upload(t.id, tu1, "ok.png")).status, 409);
    });

    await test("สลิปมีปัญหาแต่ละแบบได้ 422 พร้อมรหัสที่ถูก และนับจำนวนครั้ง", async () => {
      const t = await mkTrip(u1, d1);
      const cases = [
        ["wrong-amount.png", "AMOUNT_MISMATCH"],
        ["wrong-receiver.png", "RECEIVER_MISMATCH"],
        ["unknown-receiver.png", "RECEIVER_UNVERIFIABLE"],
        ["old-slip.png", "SLIP_TOO_OLD"],
        ["not-slip.png", "NOT_A_SLIP"],
      ];
      for (const [i, [name, code]] of cases.entries()) {
        const r = await upload(t.id, tu1, name);
        assert.equal(r.status, 422, `${name}: ${JSON.stringify(r.body)}`);
        assert.equal(r.body.code, code, name);
        if (i === 0) assert.match(r.body.error, /ลองได้อีก 4 ครั้ง/);
      }
      const cur = await prisma.serviceRequest.findUnique({ where: { id: t.id } });
      assert.equal(cur.paymentStatus, "PENDING");
      assert.equal(cur.paymentSlipAttempts, 5);
      assert.match(cur.paymentSlipError, /NOT_A_SLIP/);
      // ครบ 5 ครั้งแล้ว ส่งอีกไม่ได้ ต้องให้คนขับยืนยันเอง
      const more = await upload(t.id, tu1, "ok.png");
      assert.equal(more.status, 409);
      assert.equal(more.body.code, "SLIP_ATTEMPTS_EXCEEDED");
    });

    await test("บริการตรวจสลิปล่มไม่นับเป็นความพยายามของผู้โดยสาร", async () => {
      const t = await mkTrip(u1, d1);
      const r = await upload(t.id, tu1, "provider-down.png");
      assert.equal(r.status, 422);
      assert.equal(r.body.code, "PROVIDER_UNAVAILABLE");
      assert.equal((await prisma.serviceRequest.findUnique({ where: { id: t.id } })).paymentSlipAttempts, 0);
    });

    await test("สลิปใบเดียวใช้ได้ทริปเดียว (เลขอ้างอิงซ้ำถูกปฏิเสธ)", async () => {
      const [a, b] = [await mkTrip(u1, d1), await mkTrip(u1, d1)];
      assert.equal((await upload(a.id, tu1, "ref-abc123.png")).status, 200);
      const r = await upload(b.id, tu1, "ref-abc123.png");
      assert.equal(r.status, 422);
      assert.equal(r.body.code, "SLIP_ALREADY_USED");
    });

    await test("ส่งสลิปพร้อมกันหลายใบในทริปเดียว: สำเร็จได้ใบเดียว", async () => {
      const t = await mkTrip(u1, d1);
      const rs = await Promise.all([upload(t.id, tu1, "ok.png"), upload(t.id, tu1, "ok.png"), upload(t.id, tu1, "ok.png")]);
      assert.equal(rs.filter((r) => r.status === 200).length, 1, JSON.stringify(rs.map((r) => r.status)));
    });

    await test("เงื่อนไขก่อนอัปโหลด: ไม่ใช่เจ้าของ 403 / ทริปยังไม่จบ 409 / คนขับไม่มีพร้อมเพย์ 409 / ไม่ใช่รูป 400 / ไม่แนบไฟล์ 400", async () => {
      const t = await mkTrip(u1, d1);
      assert.equal((await upload(t.id, tu2, "ok.png")).status, 403);
      const running = await mkTrip(u1, d1, { status: "IN_PROGRESS", completedAt: null });
      assert.equal((await upload(running.id, tu1, "ok.png")).status, 409);
      const noPp = await mkTrip(u1, d2);
      const r = await upload(noPp.id, tu1, "ok.png");
      assert.equal(r.status, 409);
      assert.equal(r.body.code, "NO_PROMPTPAY");
      assert.equal((await upload(t.id, tu1, "doc.pdf", { type: "application/pdf" })).status, 400);
      const empty = await fetch(`${B}/service-requests/${t.id}/payment-slip`, { method: "POST", headers: { Authorization: `Bearer ${tu1}` } });
      assert.equal(empty.status, 400);
    });

    console.log("\nคนขับ/admin กับการยืนยันเอง");
    await test("คนขับกดยืนยันเอง = DRIVER; สลิปที่ตรวจผ่านแล้วคนขับกลับเป็นข้อพิพาทเองไม่ได้", async () => {
      const manual = await mkTrip(u1, d1);
      assert.equal((await call("POST", `/service-requests/${manual.id}/payment`, td1, { status: "PAID" })).status, 200);
      assert.equal((await prisma.serviceRequest.findUnique({ where: { id: manual.id } })).paymentConfirmedBy, "DRIVER");

      const slipTrip = await mkTrip(u1, d1);
      await upload(slipTrip.id, tu1, "ok.png");
      const dispute = await call("POST", `/service-requests/${slipTrip.id}/payment`, td1, { status: "DISPUTED", disputeNote: "ไม่ได้รับ" });
      assert.equal(dispute.status, 409);
      assert.equal((await call("POST", `/service-requests/${slipTrip.id}/payment`, td1, { status: "PAID" })).status, 200);
      assert.equal((await prisma.serviceRequest.findUnique({ where: { id: slipTrip.id } })).paymentConfirmedBy, "SLIP");
    });

    await test("ทริปที่คนขับแจ้งข้อพิพาท: ผู้โดยสารส่งสลิปที่ถูกต้องแล้วกลายเป็นจ่ายแล้ว", async () => {
      const t = await mkTrip(u1, d1, { paymentStatus: "DISPUTED", disputeNote: "ยังไม่ได้รับเงิน" });
      assert.equal((await upload(t.id, tu1, "ok.png")).status, 200);
      const cur = await prisma.serviceRequest.findUnique({ where: { id: t.id } });
      assert.equal(cur.paymentStatus, "PAID");
      assert.equal(cur.disputeNote, null);
    });

    await test("admin แก้ข้อพิพาท = ADMIN; QR บอกว่าเปิดตรวจสลิปอยู่", async () => {
      const t = await mkTrip(u1, d1, { paymentStatus: "DISPUTED", disputeNote: "x" });
      const admin = (await call("POST", "/auth/admin/login", null, { email: "admin@ku.th", password: "admin1234" })).body.token;
      assert.equal((await call("POST", `/admin/trips/${t.id}/resolve-dispute`, admin)).status, 200);
      assert.equal((await prisma.serviceRequest.findUnique({ where: { id: t.id } })).paymentConfirmedBy, "ADMIN");
      const qr = await call("GET", `/service-requests/${t.id}/payment-qr`, tu1);
      assert.equal(qr.body.slipVerification, true);
    });
  } finally {
    // อ้างอิงด้วย PREFIX ไม่ใช่ตัวแปร u1/d1/... เพราะบางตัวอาจสร้างไม่สำเร็จ (setup พังกลางคัน) แล้วยังไม่มีค่า
    const [users, drivers] = await Promise.all([
      prisma.user.findMany({ where: { phone: { startsWith: PREFIX } }, select: { id: true } }),
      prisma.driver.findMany({ where: { phone: { startsWith: PREFIX } }, select: { id: true } }),
    ]);
    const ids = [...users, ...drivers].map((x) => x.id);
    await prisma.serviceRequest.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.notification.deleteMany({ where: { recipientId: { in: ids } } });
    await prisma.user.deleteMany({ where: { phone: { startsWith: PREFIX } } });
    await prisma.driver.deleteMany({ where: { phone: { startsWith: PREFIX } } });
    await prisma.$disconnect();
    console.log(`\n${passed} tests passed${process.exitCode ? " (มีบางข้อล้มเหลว)" : ""}`);
  }
}
main().catch((err) => {
  console.error("test-payment.js: unexpected crash", err);
  process.exit(1);
});
