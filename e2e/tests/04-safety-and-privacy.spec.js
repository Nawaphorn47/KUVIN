// ชุด 04: ความปลอดภัยและความเป็นส่วนตัว — แชร์ทริป, ซ่อนเบอร์โทรหลังจบทริป, แจ้งปัญหา, เอกสารส่วนตัว, สิทธิ์เข้าถึง
const { test, expect } = require("@playwright/test");
const { API_URL } = require("../helpers/env");
const { call, createApprovedDriver, createVerifiedPassenger, startAcceptedTrip, driverOffline, PNG } = require("../helpers/api");
const { makeShooter } = require("../helpers/shot");

const shot = makeShooter("04-safety-and-privacy");

async function userPage(browser, token) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "th-TH" });
  await context.addInitScript((t) => localStorage.setItem("kuvin_token", t), token);
  return { context, page: await context.newPage() };
}

test.describe.serial("04 ความปลอดภัยและความเป็นส่วนตัว", () => {
  let passenger;
  let driver;
  let trip; // ทริปที่คนขับรับแล้ว (ACCEPTED)

  test.beforeAll(async () => {
    driver = await createApprovedDriver({ fullName: "วินัย สายฟ้า", plate: "ปล 9999" });
    passenger = await createVerifiedPassenger("นภา ใจดี");
    trip = await startAcceptedTrip(passenger.token, driver);
  });

  test.afterAll(async () => {
    await driverOffline(driver);
  });

  test("TC-04-01 แชร์ทริป: คนรับลิงก์เห็นชื่อเล่น/ป้ายทะเบียน/ตำแหน่ง แต่ไม่เห็นเบอร์โทรและนามสกุล", async ({ browser, request }) => {
    const { token } = await call("POST", `/service-requests/${trip.id}/share`, { token: passenger.token });
    const stranger = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "th-TH" }); // ไม่ล็อกอิน
    const page = await stranger.newPage();
    await page.goto(`/track/${token}`);
    await expect(page.getByText("ติดตามทริปของ นภา")).toBeVisible();
    await expect(page.getByText("วินัย")).toBeVisible();
    await expect(page.getByText("ปล 9999")).toBeVisible();
    await shot(page, "share-page");
    const text = await page.locator("body").innerText();
    expect(text).not.toContain(driver.phone);
    expect(text).not.toContain("ใจดี"); // นามสกุลผู้โดยสาร
    expect(text).not.toContain("สายฟ้า"); // นามสกุลคนขับ
    await stranger.close();

    // ผ่าน API ตรง ๆ ก็ต้องไม่มีเบอร์
    const res = await request.get(`${API_URL}/api/public/trip-share/${token}`);
    expect(JSON.stringify(await res.json())).not.toContain(driver.phone);
  });

  test("TC-04-02 ผู้โดยสารเห็นเบอร์คนขับเฉพาะระหว่างทริป", async () => {
    const active = await call("GET", `/service-requests/${trip.id}`, { token: passenger.token });
    expect(active.driver.phone).toBe(driver.phone);
  });

  test("TC-04-03 จบทริปแล้วเบอร์ของอีกฝ่ายถูกซ่อน ทั้งในรายละเอียดและประวัติ", async () => {
    await call("POST", `/service-requests/${trip.id}/start`, { token: driver.driverToken });
    await call("POST", `/service-requests/${trip.id}/complete`, { token: driver.driverToken });
    const detail = await call("GET", `/service-requests/${trip.id}`, { token: passenger.token });
    expect(detail.driver.phone).toBeNull();
    const list = await call("GET", "/service-requests/mine", { token: passenger.token });
    expect(list[0].driver.phone).toBeNull();
    const driverList = await call("GET", "/service-requests/driver/mine", { token: driver.driverToken });
    expect(driverList[0].user.phone).toBeNull();
  });

  test("TC-04-04 แจ้งปัญหาหลังทริปจากหน้าประวัติ → ส่งสำเร็จ → แอดมินวิทยาเขตเห็นเคส", async ({ browser }) => {
    const { context, page } = await userPage(browser, passenger.token);
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "ทริปของฉัน" })).toBeVisible();
    await shot(page, "history");
    await page.getByRole("button", { name: "แจ้งปัญหา" }).first().click();
    await expect(page.getByRole("heading", { name: "เกิดอะไรขึ้น?" }).or(page.getByText("เกิดอะไรขึ้น?"))).toBeVisible();
    await page.getByRole("radio", { name: "ขับรถอันตราย" }).click();
    await page.getByLabel(/เล่ารายละเอียด/).fill("ขี่เร็วมากตอนเลี้ยวหน้าตึก");
    await shot(page, "report-form");
    await page.getByRole("button", { name: "ส่งให้แอดมินตรวจสอบ" }).click();
    await expect(page.getByRole("heading", { name: "ส่งถึงแอดมินแล้ว" })).toBeVisible();
    await shot(page, "report-sent");
    await context.close();

    const admin = await require("../helpers/api").adminToken();
    const reports = await call("GET", "/admin/reports?status=OPEN", { token: admin });
    const mine = reports.find((r) => r.serviceRequestId === trip.id && r.reporterRole === "user");
    expect(mine).toMatchObject({ category: "DANGEROUS_DRIVING", urgent: true });
  });

  test("TC-04-05 แจ้งปัญหาซ้ำทริปเดิมขณะเคสยังเปิดอยู่ไม่ได้", async () => {
    await expect(
      call("POST", `/service-requests/${trip.id}/report`, { token: passenger.token, body: { category: "OVERCHARGE" } })
    ).rejects.toThrow(/แจ้งปัญหาทริปนี้ไว้แล้ว|409/);
  });

  test("TC-04-06 เอกสารคนขับเป็นไฟล์ส่วนตัว: เปิดผ่านลิงก์เซ็นแล้วได้ แต่เปิดผ่านโฟลเดอร์สาธารณะไม่ได้", async ({ request }) => {
    const me = await call("GET", "/drivers/me", { token: driver.driverToken });
    expect(me.idCardPhotoUrl).toMatch(/^\/api\/private-files\//);
    const ok = await request.get(`${API_URL}${me.idCardPhotoUrl}`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()["cache-control"]).toContain("no-store");
    const publicTry = await request.get(`${API_URL}/uploads/.private/anything.png`);
    expect(publicTry.status()).toBe(404);
    const forged = await request.get(`${API_URL}/api/private-files/ไม่ใช่โทเคน`);
    expect(forged.status()).toBe(404);
  });

  test("TC-04-07 อัปโหลดเอกสาร: ไฟล์ที่ไม่ใช่รูปจริง (HTML ปลอมนามสกุล) ถูกปฏิเสธ", async () => {
    const form = new FormData();
    form.append("file", new Blob(["<html><script>alert(1)</script></html>"], { type: "image/png" }), "x.png");
    await expect(call("POST", "/drivers/me/documents", { token: driver.driverToken, form })).rejects.toThrow(/400|ไม่ใช่รูป/);
  });

  test("TC-04-08 ผู้ใช้ทั่วไปอัปโหลดเข้าโฟลเดอร์สาธารณะไม่ได้ (เฉพาะแอดมิน)", async () => {
    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), "a.png");
    await expect(call("POST", "/uploads", { token: passenger.token, form })).rejects.toThrow(/403|Insufficient/);
  });

  test("TC-04-09 สิทธิ์: ผู้โดยสารเรียกหน้าที่ของแอดมิน/คนขับไม่ได้ และคนนอกทริปอ่านแชตไม่ได้", async () => {
    await expect(call("GET", "/admin/reports", { token: passenger.token })).rejects.toThrow(/403|Insufficient/);
    await expect(call("GET", "/drivers/me", { token: passenger.token })).rejects.toThrow(/403|Insufficient/);
    const other = await createVerifiedPassenger("คนนอก ทริป");
    await expect(call("GET", `/service-requests/${trip.id}/messages`, { token: other.token })).rejects.toThrow(/403|ไม่มีสิทธิ์/);
  });

  test("TC-04-10 ไม่มี token เรียก API ที่ต้องล็อกอินไม่ได้ (401)", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/service-requests/mine`);
    expect(res.status()).toBe(401);
  });
});
