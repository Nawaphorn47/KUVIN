// ชุด 01: ระบบขึ้นครบและหน้าหลักเปิดได้ (ทดสอบแรกเสมอ — ถ้าชุดนี้พัง ชุดอื่นไม่ต้องรัน)
const { test, expect } = require("@playwright/test");
const { API_URL, ADMIN_URL } = require("../helpers/env");
const { makeShooter } = require("../helpers/shot");

const shot = makeShooter("01-smoke");

test.describe("01 ระบบขึ้นครบ", () => {
  test("TC-01-01 API /health ตอบ 200 และเชื่อมฐานข้อมูลได้", async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, db: "up" });
  });

  test("TC-01-02 API ส่ง security headers และไม่เปิดเผยรุ่นของ framework", async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("TC-01-03 ค่าตั้งค่าที่แอปใช้ (auth/config) บอกว่า OTP เป็นโหมดทดสอบ และมีประเภทคนขับครบ 3 แบบ", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/auth/config`);
    const cfg = await res.json();
    expect(cfg.otp).toBe("test");
    expect(Object.keys(cfg.driverTypes).sort()).toEqual(["PRO", "PUBLIC", "STUDENT"]);
    expect(cfg.passengerVerification).toBe(true);
  });

  test("TC-01-04 เว็บแอปเปิดได้ → Splash → หน้าต้อนรับ → หน้าเข้าสู่ระบบ", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "KUVIN" })).toBeVisible();
    await shot(page, "splash");
    await expect(page.getByRole("heading", { name: /เรียกวิน แตะเลขเดียวก็ไป/ })).toBeVisible({ timeout: 10_000 });
    await shot(page, "onboarding");
    await page.getByRole("button", { name: "เริ่มต้นใช้งาน" }).click();
    await expect(page.getByRole("heading", { name: "เข้าใช้ด้วยเบอร์มือถือ" })).toBeVisible();
    await shot(page, "login");
  });

  test("TC-01-05 หน้าแอดมินเปิดได้และมีฟอร์มล็อกอิน", async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.getByLabel(/อีเมล/)).toBeVisible();
    await expect(page.getByLabel(/รหัสผ่าน/)).toBeVisible();
    await shot(page, "admin-login");
  });

  test("TC-01-06 ลิงก์แชร์ทริปที่ไม่ถูกต้องแสดงข้อความ ไม่พังทั้งหน้า", async ({ page }) => {
    await page.goto("/track/token-ปลอม");
    await expect(page.getByRole("heading", { name: "เปิดลิงก์ไม่ได้" })).toBeVisible();
    await shot(page, "track-invalid");
  });
});
