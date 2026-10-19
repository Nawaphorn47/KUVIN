// ชุด 02: ผู้โดยสารสมัคร/เข้าระบบด้วย OTP (โหมดทดสอบ) และด่านยืนยันตัวตน (เบอร์ + เซลฟี่) ก่อนเรียกวินครั้งแรก
const { test, expect } = require("@playwright/test");
const { testPhone, PNG } = require("../helpers/api");
const { makeShooter } = require("../helpers/shot");

const shot = makeShooter("02-passenger-auth");

async function requestOtp(page, phone) {
  await page.goto("/login");
  await page.getByLabel("เบอร์มือถือ").fill(phone);
  await page.getByRole("button", { name: "ขอรหัส OTP" }).click();
  await expect(page.getByText("โหมดทดสอบ")).toBeVisible();
}

test.describe("02 ผู้โดยสาร: สมัคร/เข้าระบบ/ยืนยันตัวตน", () => {
  test("TC-02-01 เบอร์ใหม่: ขอ OTP → ใส่รหัส → ตั้งชื่อ → เข้าหน้าแรกได้", async ({ page }) => {
    const phone = testPhone();
    await page.goto("/login");
    await shot(page, "login");
    await page.getByLabel("เบอร์มือถือ").fill(phone);
    await page.getByRole("button", { name: "ขอรหัส OTP" }).click();
    await expect(page.getByText("โหมดทดสอบ")).toBeVisible();
    await shot(page, "otp-test-banner");
    await page.getByRole("button", { name: "ใส่ให้" }).click();
    await expect(page.getByRole("heading", { name: "เรียกคุณว่าอะไรดี?" })).toBeVisible();
    await shot(page, "ask-name");
    await page.getByLabel("ชื่อ-นามสกุล").fill("สมหญิง ทดสอบ");
    await page.getByRole("button", { name: "เริ่มใช้งาน" }).click();
    await expect(page.getByRole("heading", { name: "ไปไหนดี?" })).toBeVisible();
    await expect(page.getByText("หวัดดี สมหญิง ทดสอบ")).toBeVisible();
    await shot(page, "home");
  });

  test("TC-02-02 กรอก OTP ผิด: ขึ้นข้อความผิดพลาด ไม่เข้าระบบ", async ({ page }) => {
    await requestOtp(page, testPhone());
    const real = await page.locator("text=/รหัสคือ/").locator("span.tabular").innerText();
    const wrong = real === "000000" ? "111111" : "000000";
    await page.getByLabel("รหัส OTP 6 หลัก").fill(wrong);
    await expect(page.getByRole("alert")).toContainText("รหัส OTP ไม่ถูกต้อง");
    await shot(page, "otp-wrong");
    await expect(page).toHaveURL(/\/login/);
  });

  test("TC-02-03 ขอ OTP ซ้ำทันทีไม่ได้ (นับถอยหลัง 30 วินาที)", async ({ page }) => {
    await requestOtp(page, testPhone());
    await expect(page.getByRole("button", { name: /ขอรหัสใหม่ได้ใน \d+ วินาที/ })).toBeDisabled();
    await shot(page, "otp-cooldown");
  });

  test("TC-02-04 เบอร์ไม่ถูกต้อง (ไม่ครบ 10 หลัก) กดขอรหัสไม่ได้", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("เบอร์มือถือ").fill("08123");
    await expect(page.getByRole("button", { name: "ขอรหัส OTP" })).toBeDisabled();
  });

  test("TC-02-05 เรียกวินครั้งแรกต้องถ่ายเซลฟี่ก่อน แล้วกลับมาเรียกต่อได้", async ({ page }) => {
    const phone = testPhone();
    await requestOtp(page, phone);
    await page.getByRole("button", { name: "ใส่ให้" }).click();
    await page.getByLabel("ชื่อ-นามสกุล").fill("เซลฟี่ ทดสอบ");
    await page.getByRole("button", { name: "เริ่มใช้งาน" }).click();
    await expect(page.getByRole("heading", { name: "ไปไหนดี?" })).toBeVisible();

    // เลือกปลายทางแรกจากแผนผัง → หน้าเช็กก่อนเรียก
    await page.getByRole("button", { name: /เรียกวินไป/ }).click();
    await expect(page.getByRole("heading", { name: "เช็กก่อนเรียก" }).or(page.getByText("เช็กก่อนเรียก"))).toBeVisible();
    await expect(page.getByRole("button", { name: "ยืนยันตัวตนก่อนเรียกครั้งแรก" })).toBeVisible();
    await shot(page, "confirm-needs-verify");

    // ด่านยืนยันตัวตน: เบอร์ยืนยันแล้วจาก OTP → เหลือเซลฟี่
    await page.getByRole("button", { name: "ยืนยันตัวตนก่อนเรียกครั้งแรก" }).click();
    await expect(page.getByRole("heading", { name: /ยืนยันตัวตนครั้งเดียว/ })).toBeVisible();
    await shot(page, "verify-selfie-step");
    await page.locator('input[type="file"]').setInputFiles({ name: "selfie.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByRole("button", { name: "ใช้รูปนี้" })).toBeVisible();
    await shot(page, "selfie-preview");
    await page.getByRole("button", { name: "ใช้รูปนี้" }).click();

    // กลับมาหน้าเช็กก่อนเรียก และปุ่มเรียกวินกดได้แล้ว
    await expect(page.getByRole("button", { name: /^เรียกวินเลย/ })).toBeVisible({ timeout: 20_000 });
    await shot(page, "confirm-ready");
  });
});
