// ชุด 03: เรียกวิน → คนขับรับงาน → แชต → เดินทาง → จบทริป → เก็บเงินสด → ให้คะแนน ด้วยผู้ใช้ 2 คนพร้อมกัน (2 หน้าต่าง)
// เตรียมข้อมูล (บัญชีผู้โดยสารที่ยืนยันตัวตนแล้ว + คนขับที่แอดมินอนุมัติแล้ว) ผ่าน API ส่วนที่ทดสอบคือการใช้งานผ่านหน้าจอทั้งหมด
const { test, expect } = require("@playwright/test");
const { call, createApprovedDriver, driverOffline, otpLogin, testPhone, PNG } = require("../helpers/api");
const { makeShooter } = require("../helpers/shot");

const shotP = makeShooter("03-full-trip-passenger");
const shotD = makeShooter("03-full-trip-driver");

async function asUser(browser, token) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    locale: "th-TH",
    geolocation: { latitude: 14.023, longitude: 99.9739 },
    permissions: ["geolocation"],
  });
  await context.addInitScript((t) => localStorage.setItem("kuvin_token", t), token);
  return { context, page: await context.newPage() };
}

test("TC-03-01 ทริปเต็ม: เรียกวิน → รับงาน → แชต → เดินทาง → จบ → จ่ายเงินสด → ให้คะแนน", async ({ browser }) => {
  // ---------- เตรียมข้อมูล ----------
  const driver = await createApprovedDriver({ fullName: "สมชาย ขับดี", plate: "ทด 5678" });
  const passengerAuth = await otpLogin(testPhone(), "สมใจ ผู้โดยสาร");
  const form = new FormData();
  form.append("file", new Blob([PNG], { type: "image/png" }), "selfie.png");
  await call("POST", "/users/me/selfie", { token: passengerAuth.token, form });

  const P = await asUser(browser, passengerAuth.token);
  const D = await asUser(browser, driver.driverToken);
  const p = P.page;
  const d = D.page;

  try {
    // ---------- คนขับออนไลน์เข้าคิว ----------
    await test.step("คนขับกดออนไลน์ เข้าคิวรับงาน", async () => {
      await d.goto("/driver/home");
      await expect(d.getByText("สมชาย ขับดี")).toBeVisible();
      await shotD(d, "home-offline");
      await d.getByRole("button", { name: /แตะเพื่อเริ่มรับงาน/ }).click();
      await expect(d.getByRole("button", { name: /ออนไลน์อยู่/ })).toBeVisible();
      await shotD(d, "home-online");
    });

    // ---------- ผู้โดยสารเรียกวิน ----------
    await test.step("ผู้โดยสารเลือกปลายทางและเรียกวิน", async () => {
      await p.goto("/home");
      await expect(p.getByRole("heading", { name: "ไปไหนดี?" })).toBeVisible();
      await shotP(p, "home");
      await p.getByRole("button", { name: /เรียกวินไป/ }).click();
      await expect(p.getByRole("button", { name: /^เรียกวินเลย/ })).toBeVisible({ timeout: 20_000 });
      await shotP(p, "confirm");
      await p.getByRole("button", { name: /^เรียกวินเลย/ }).click();
      await expect(p.getByText("กำลังหาวินให้คุณ")).toBeVisible();
      await shotP(p, "searching");
    });

    // ---------- คนขับได้รับข้อเสนอและกดรับ ----------
    await test.step("คนขับได้รับงานที่เสนอเข้ามาและกดรับ", async () => {
      await expect(d.getByRole("heading", { name: "งานใหม่เข้า" })).toBeVisible({ timeout: 60_000 });
      await shotD(d, "incoming-job");
      await d.getByRole("button", { name: "รับงาน" }).click();
      await expect(d.getByRole("button", { name: "ถึงจุดรับแล้ว" })).toBeVisible();
      await shotD(d, "navigate-pickup");
    });

    await test.step("ผู้โดยสารเห็นคนขับกำลังมา พร้อมข้อมูลคนขับ", async () => {
      await expect(p.getByText("คนขับกำลังมารับ")).toBeVisible({ timeout: 20_000 });
      await expect(p.getByText("สมชาย ขับดี")).toBeVisible();
      await expect(p.getByText("ทด 5678")).toBeVisible();
      await expect(p.getByText("บุคคลทั่วไป")).toBeVisible();
      await expect(p.getByRole("button", { name: /แชร์ทริปให้คนที่ไว้ใจ/ })).toBeVisible();
      await shotP(p, "driver-arriving");
    });

    // ---------- แชต 2 ทาง ----------
    await test.step("ผู้โดยสารส่งข้อความหาคนขับ คนขับเห็นและตอบกลับ", async () => {
      await p.getByRole("button", { name: /แชตกับคนขับ/ }).click();
      await p.getByLabel(/พิมพ์ข้อความถึง/).fill("รออยู่หน้าตึกค่ะ ใส่เสื้อสีเหลือง");
      await p.getByRole("button", { name: "ส่งข้อความ" }).click();
      await expect(p.locator("ol").getByText("รออยู่หน้าตึกค่ะ ใส่เสื้อสีเหลือง")).toBeVisible();
      await shotP(p, "chat-sent");

      await d.getByRole("button", { name: /แชตกับผู้โดยสาร|แชต/ }).first().click();
      await expect(d.locator("ol").getByText("รออยู่หน้าตึกค่ะ ใส่เสื้อสีเหลือง")).toBeVisible({ timeout: 15_000 });
      await d.getByRole("button", { name: "อีก 2 นาทีถึง" }).click();
      await expect(d.locator("ol").getByText("อีก 2 นาทีถึง")).toBeVisible();
      await shotD(d, "chat-driver-view");

      // ผู้โดยสารได้ข้อความตอบกลับแบบ real-time
      await expect(p.locator("ol").getByText("อีก 2 นาทีถึง")).toBeVisible({ timeout: 15_000 });
      await shotP(p, "chat-reply-received");

      await p.goBack();
      await d.goBack();
    });

    // ---------- เดินทาง ----------
    await test.step("คนขับถึงจุดรับ → ผู้โดยสารขึ้นรถ → เริ่มเดินทาง", async () => {
      await d.getByRole("button", { name: "ถึงจุดรับแล้ว" }).click();
      await expect(d.getByRole("button", { name: /ผู้โดยสารขึ้นรถแล้ว/ })).toBeVisible();
      await shotD(d, "arrived-pickup");
      await d.getByRole("button", { name: /ผู้โดยสารขึ้นรถแล้ว/ }).click();
      await expect(d.getByRole("button", { name: "ถึงปลายทางแล้ว" })).toBeVisible();
      await shotD(d, "during-ride");
      await expect(p.getByText(/กำลังไป/)).toBeVisible({ timeout: 20_000 });
      await shotP(p, "during-ride");
    });

    // ---------- จบทริป เก็บเงิน ----------
    await test.step("คนขับถึงปลายทาง → ผู้โดยสารเห็นหน้าจ่ายเงิน → คนขับยืนยันรับเงินสด", async () => {
      await d.getByRole("button", { name: "ถึงปลายทางแล้ว" }).click();
      await expect(d.getByRole("button", { name: "ยืนยันได้รับเงินสดแล้ว" })).toBeVisible();
      await shotD(d, "finish-collect");
      await expect(p.getByText("จ่ายค่าวิน")).toBeVisible({ timeout: 20_000 });
      await shotP(p, "ride-completed-unpaid");

      await d.getByRole("button", { name: "ยืนยันได้รับเงินสดแล้ว" }).click();
      await expect(d.getByText(/ได้รับเงิน .* บาทแล้ว/)).toBeVisible();
      await shotD(d, "finish-paid");
      await expect(p.getByText(/จ่ายเรียบร้อย/)).toBeVisible({ timeout: 20_000 });
      await shotP(p, "ride-completed-paid");
    });

    // ---------- ให้คะแนน ----------
    await test.step("ผู้โดยสารให้คะแนนพร้อมแท็ก", async () => {
      await p.getByRole("button", { name: "ให้คะแนนคนขับ" }).click();
      await expect(p.getByRole("heading", { name: "สมชาย ขับดี" })).toBeVisible();
      await p.getByRole("button", { name: "ขับปลอดภัย" }).click();
      await p.getByLabel(/อยากบอกอะไรเพิ่ม/).fill("ขับดีมากค่ะ");
      await shotP(p, "rating");
      await p.getByRole("button", { name: "ส่งคะแนน" }).click();
      await expect(p.getByRole("heading", { name: "ไปไหนดี?" })).toBeVisible();
    });

    // ---------- ตรวจผลในระบบ ----------
    await test.step("ตรวจผลในฐานข้อมูลผ่าน API", async () => {
      const trips = await call("GET", "/service-requests/mine", { token: passengerAuth.token });
      expect(trips).toHaveLength(1);
      expect(trips[0]).toMatchObject({ status: "COMPLETED", paymentStatus: "PAID" });
      const detail = await call("GET", `/service-requests/${trips[0].id}`, { token: passengerAuth.token });
      expect(detail.rating).toMatchObject({ score: 5 });
      expect(detail.rating.comment).toContain("#ขับปลอดภัย");
      const msgs = await call("GET", `/service-requests/${trips[0].id}/messages`, { token: passengerAuth.token });
      expect(msgs.open).toBe(false);
      expect(msgs.messages.length).toBeGreaterThanOrEqual(2);
    });

  } finally {
    // ปิดสถานะออนไลน์ของคนขับทดสอบผ่าน API เสมอ (แม้เทสต์ล้ม) ไม่ให้ค้างหัวคิวแล้วแย่งงานของชุดถัดไป
    await driverOffline(driver);
    await P.context.close();
    await D.context.close();
  }
});
