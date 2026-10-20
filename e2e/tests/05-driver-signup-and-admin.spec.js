// ชุด 05: สมัครขับวินผ่านหน้าจอ (นิสิต / วินมอเตอร์ไซค์) → ส่งเอกสาร → แอดมินตรวจและอนุมัติ/ปฏิเสธผ่านแดชบอร์ด → คนขับเข้าคิวได้
const { test, expect } = require("@playwright/test");
const { ADMIN_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = require("../helpers/env");
const { call, otpLogin, testPhone, PNG, createVerifiedPassenger } = require("../helpers/api");
const { makeShooter } = require("../helpers/shot");

const shot = makeShooter("05-driver-signup-and-admin");
const FILE = { name: "doc.png", mimeType: "image/png", buffer: PNG };

async function userPage(browser, token) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "th-TH" });
  await context.addInitScript((t) => localStorage.setItem("kuvin_token", t), token);
  return { context, page: await context.newPage() };
}

async function adminLogin(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "th-TH" });
  const page = await context.newPage();
  await page.goto(ADMIN_URL);
  await page.getByLabel("อีเมล").fill(ADMIN_EMAIL);
  await page.getByLabel("รหัสผ่าน").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /เข้าสู่ระบบ/ }).click();
  await expect(page.getByRole("heading", { name: "ภาพรวม" })).toBeVisible();
  return { context, page };
}

test.describe.serial("05 สมัครขับวิน + แอดมินตรวจเอกสาร", () => {
  test("TC-05-01 นิสิตสมัครขับ: เลือกประเภท → กรอกรหัสนิสิต → ส่งเอกสาร 5 ใบ → รอตรวจ", async ({ browser }) => {
    const auth = await createVerifiedPassenger("นิสิต สมัครขับ");
    const { context, page } = await userPage(browser, auth.token);
    await page.goto("/become-driver");

    await expect(page.getByRole("heading", { name: "คุณขับในฐานะอะไร?" })).toBeVisible();
    await shot(page, "choose-type");
    await page.getByRole("radio", { name: /นิสิต/ }).click();
    await page.getByLabel("รหัสนิสิต").fill("6510500123");
    await page.getByLabel("ป้ายทะเบียน").fill("นศ 1111");
    await shot(page, "student-form");
    await page.getByRole("button", { name: "ต่อไป แนบเอกสาร" }).click();

    // หน้าแนบเอกสารของนิสิต: ต้องมีบัตรนิสิต (ไม่ใช่บัตรประชาชน) ครบ 5 ใบ
    await expect(page.getByText("สมัครในฐานะนิสิต")).toBeVisible();
    await expect(page.getByText("บัตรนิสิต")).toBeVisible();
    await expect(page.getByText("บัตรประชาชน")).toHaveCount(0);
    await shot(page, "student-documents-empty");
    await expect(page.getByRole("button", { name: /แนบอีก 5 รายการ/ })).toBeDisabled();
    const inputs = page.locator('input[type="file"]');
    await expect(inputs).toHaveCount(5);
    for (let i = 0; i < 5; i++) await inputs.nth(i).setInputFiles(FILE);
    await expect(page.getByRole("button", { name: "ส่งให้แอดมินตรวจ" })).toBeEnabled();
    await shot(page, "student-documents-full");
    await page.getByRole("button", { name: "ส่งให้แอดมินตรวจ" }).click();
    await expect(page.getByRole("heading", { name: /ส่งเอกสารแล้ว รอแอดมินตรวจ/ })).toBeVisible();
    await shot(page, "pending");
    await context.close();
  });

  test("TC-05-02 วินมอเตอร์ไซค์: ต้องกรอกเบอร์เสื้อวินและชื่อวิน, เอกสารต่างจากนิสิต (เสื้อวิน + ใบขับขี่สาธารณะ)", async ({ browser }) => {
    const auth = await createVerifiedPassenger("วิน สมัครขับ");
    const { context, page } = await userPage(browser, auth.token);
    await page.goto("/become-driver");
    await page.getByRole("radio", { name: /วินมอเตอร์ไซค์/ }).click();
    await page.getByLabel("ป้ายทะเบียน").fill("1กข 5555");
    await expect(page.getByRole("button", { name: "ต่อไป แนบเอกสาร" })).toBeDisabled(); // ยังขาดเบอร์เสื้อวิน + ชื่อวิน
    // เบอร์วินห้ามซ้ำในวิทยาเขตเดียวกัน — ใช้เลขไม่ซ้ำทุกรอบ
    await page.getByLabel("เบอร์เสื้อวิน").fill(String(Date.now()).slice(-8));
    await page.getByLabel("ชื่อวินที่สังกัด").fill("วินหน้าประตู 1");
    await shot(page, "pro-form");
    await page.getByRole("button", { name: "ต่อไป แนบเอกสาร" }).click();
    await expect(page.getByText("สมัครในฐานะวินมอเตอร์ไซค์")).toBeVisible();
    await expect(page.getByText("เสื้อวิน")).toBeVisible();
    await expect(page.getByText("ใบขับขี่รถจักรยานยนต์สาธารณะ")).toBeVisible();
    await shot(page, "pro-documents");
    await context.close();
  });

  test("TC-05-03 ไม่เลือกประเภท/นิสิตไม่กรอกรหัสนิสิต กดต่อไปไม่ได้", async ({ browser }) => {
    const auth = await createVerifiedPassenger("ฟอร์ม ไม่ครบ");
    const { context, page } = await userPage(browser, auth.token);
    await page.goto("/become-driver");
    await expect(page.getByRole("button", { name: "เลือกประเภทก่อน" })).toBeDisabled();
    await page.getByRole("radio", { name: /นิสิต/ }).click();
    await page.getByLabel("ป้ายทะเบียน").fill("นศ 2222");
    await expect(page.getByRole("button", { name: "ต่อไป แนบเอกสาร" })).toBeDisabled();
    await context.close();
  });

  test("TC-05-04 แอดมินล็อกอินแดชบอร์ด เห็นคนขับรออนุมัติพร้อมประเภทและรูปเอกสาร แล้วอนุมัติได้", async ({ browser }) => {
    // เตรียมคนขับที่ส่งเอกสารแล้ว (ผ่าน API) ให้มีชื่อที่ค้นเจอแน่นอน
    const auth = await otpLogin(testPhone(), "ตรวจเอกสาร ทดสอบ");
    const areas = await call("GET", "/areas");
    const created = await call("POST", "/auth/user/become-driver", {
      token: auth.token,
      body: { areaId: areas[0].id, licensePlate: "ตร 4444", driverType: "STUDENT", studentId: "6510500999" },
    });
    const docs = {};
    for (const key of ["photoUrl", "studentCardPhotoUrl", "driverLicensePhotoUrl", "vehiclePhotoUrl", "platePhotoUrl"]) {
      const form = new FormData();
      form.append("file", new Blob([PNG], { type: "image/png" }), `${key}.png`);
      docs[key] = (await call("POST", "/drivers/me/documents", { token: created.token, form })).ref;
    }
    await call("POST", "/drivers/me/verify", { token: created.token, body: docs });

    const { context, page } = await adminLogin(browser);
    await page.getByRole("tab", { name: /รออนุมัติคนขับ/ }).click(); // คิวงานเลือกแท็บที่เร่งด่วนที่สุดให้เอง จึงกดไปที่คิวคนขับก่อน
    await shot(page, "admin-dashboard");
    await expect(page.getByText("รออนุมัติคนขับ")).toBeVisible();
    const row = page.locator("div", { hasText: "ตรวจเอกสาร ทดสอบ" }).filter({ has: page.getByRole("button", { name: "ตรวจสอบ" }) }).last();
    await row.getByRole("button", { name: "ตรวจสอบ" }).click();
    await expect(page.getByRole("heading", { name: "ตรวจสอบเอกสารคนขับ" })).toBeVisible();
    await expect(page.getByText(/นิสิต · รหัส 6510500999/)).toBeVisible(); // ประเภท + รหัสนิสิตของคนที่ถูกตรวจ
    await expect(page.locator('img[alt="บัตรนิสิต"]')).toBeVisible();
    await shot(page, "admin-review-modal");
    await page.getByRole("button", { name: "อนุมัติ" }).click();
    await expect(page.getByRole("heading", { name: "ตรวจสอบเอกสารคนขับ" })).toBeHidden();
    await shot(page, "admin-after-approve");
    await context.close();

    const me = await call("GET", "/drivers/me", { token: created.token });
    expect(me.verificationStatus).toBe("APPROVED");
  });

  test("TC-05-05 แอดมินปฏิเสธเอกสาร: ต้องระบุเหตุผล และคนขับเห็นเหตุผลในแอป", async ({ browser }) => {
    const auth = await otpLogin(testPhone(), "ปฏิเสธ ทดสอบ");
    const areas = await call("GET", "/areas");
    const created = await call("POST", "/auth/user/become-driver", {
      token: auth.token,
      body: { areaId: areas[0].id, licensePlate: "ปส 3333", driverType: "PUBLIC" },
    });
    const docs = {};
    for (const key of ["photoUrl", "idCardPhotoUrl", "driverLicensePhotoUrl", "vehiclePhotoUrl", "platePhotoUrl"]) {
      const form = new FormData();
      form.append("file", new Blob([PNG], { type: "image/png" }), `${key}.png`);
      docs[key] = (await call("POST", "/drivers/me/documents", { token: created.token, form })).ref;
    }
    await call("POST", "/drivers/me/verify", { token: created.token, body: docs });

    const admin = await adminLogin(browser);
    await admin.page.getByRole("tab", { name: /รออนุมัติคนขับ/ }).click();
    const row = admin.page.locator("div", { hasText: "ปฏิเสธ ทดสอบ" }).filter({ has: admin.page.getByRole("button", { name: "ตรวจสอบ" }) }).last();
    await row.getByRole("button", { name: "ตรวจสอบ" }).click();
    await admin.page.getByRole("button", { name: "ปฏิเสธ" }).click();
    await expect(admin.page.getByRole("button", { name: "ยืนยันปฏิเสธ" })).toBeDisabled(); // ยังไม่ใส่เหตุผล
    await admin.page.getByLabel(/เหตุผลที่ปฏิเสธ/).fill("รูปบัตรประชาชนไม่ชัด");
    await shot(admin.page, "admin-reject-reason");
    await admin.page.getByRole("button", { name: "ยืนยันปฏิเสธ" }).click();
    await expect(admin.page.getByRole("heading", { name: "ตรวจสอบเอกสารคนขับ" })).toBeHidden();
    await admin.context.close();

    const { context, page } = await userPage(browser, created.token);
    await page.goto("/driver/profile");
    await expect(page.getByText("ต้องแก้")).toBeVisible(); // รอโปรไฟล์โหลดเสร็จก่อนกด
    await page.getByRole("button", { name: /ยืนยันตัวตนคนขับ/ }).click();
    await expect(page.getByRole("heading", { name: "เอกสารยังไม่ผ่าน" })).toBeVisible();
    await expect(page.getByText("รูปบัตรประชาชนไม่ชัด")).toBeVisible();
    await shot(page, "driver-sees-rejection");
    await context.close();
  });
});
