// ทดสอบสมัคร/ล็อกอินด้วยอีเมลไหนก็ได้ และรีเซ็ตรหัสผ่านด้วยรหัส 6 หลัก — รัน: npm run test:auth
// เรียก auth.service ตรง ๆ (ไม่ผ่าน HTTP) เพื่อสลับ env ได้ทีละเคส (เช่น ไม่ได้ตั้ง SMTP) และไม่ชน rate limit
// ของ endpoint auth; ไม่ต้องเปิด API — ต้องมีแค่ DB. สร้างบัญชีชั่วคราวผ่าน registerUser จริง (เบอร์ต้องผ่าน
// validation 10 หลัก จึงใช้ prefix ตัวเลข 0997) แล้วลบทิ้งตอนจบด้วยอีเมลเฉพาะของรอบนี้
require("dotenv").config();
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");
const auth = require("../src/services/auth.service");

const stamp = Date.now();
const phone = (n) => `0997${String(stamp).slice(-5)}${n}`; // 0 + 9 หลัก ไม่ซ้ำข้ามรอบ
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

// ตั้ง env ชั่วคราวระหว่างเคส แล้วคืนค่าเดิม (ไม่ให้เคสหนึ่งไปกระทบอีกเคส)
async function withEnv(vars, fn) {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const noSmtp = {
  SMTP_HOST: undefined,
  SMTP_USER: undefined,
  SMTP_PASS: undefined,
  BREVO_API_KEY: undefined,
  MAIL_FROM: undefined,
};
const devCodes = { ...noSmtp, DEV_SHOW_RESET_CODE: "1", NODE_ENV: undefined };

async function expectReject(promise, pattern) {
  await assert.rejects(promise, (err) => {
    assert.match(err.message, pattern);
    return true;
  });
}

async function main() {
  const email = `Kuvin.Test.${stamp}@Gmail.com`; // ตัวพิมพ์ใหญ่ปน + ไม่ใช่ @ku.th
  const lower = email.toLowerCase();
  let userId;

  console.log("สมัคร/ล็อกอิน");
  await test("สมัครด้วยอีเมลที่ไม่ใช่ @ku.th ได้ และเก็บเป็นตัวพิมพ์เล็ก", async () => {
    const { user } = await auth.registerUser({ fullName: "T-auth", phone: phone(1), email, password: "oldpass123" });
    userId = user.id;
    assert.equal(user.email, lower);
    assert.equal(user.resetAttempts, undefined, "ไม่ควรส่งฟิลด์รีเซ็ตรหัสผ่านออกไป");
  });
  await test("สมัครซ้ำด้วยอีเมลเดิมต่างตัวพิมพ์ไม่ได้", () =>
    expectReject(auth.registerUser({ fullName: "T", phone: phone(2), email: lower.toUpperCase(), password: "x1234567" }), /ถูกใช้สมัครไปแล้ว/)
  );
  await test("อีเมลรูปแบบผิดสมัครไม่ได้", () =>
    expectReject(auth.registerUser({ fullName: "T", phone: phone(3), email: "not-an-email", password: "x1234567" }), /รูปแบบอีเมล/)
  );
  await test("ล็อกอินได้ไม่ว่าพิมพ์อีเมลตัวเล็กหรือใหญ่", async () => {
    await auth.loginUser({ email: lower.toUpperCase(), password: "oldpass123" });
    await auth.loginUser({ email: `  ${lower}  `, password: "oldpass123" });
  });

  await test("แอดมินล็อกอินได้ไม่ว่าพิมพ์อีเมลตัวเล็ก/ใหญ่หรือมีช่องว่าง", async () => {
    await prisma.admin.create({
      data: { fullName: "T-admin", email: `admin.${lower}`, passwordHash: await bcrypt.hash("adminpass123", 4) },
    });
    await auth.loginAdmin({ email: ` ADMIN.${lower.toUpperCase()} `, password: "adminpass123" });
    await expectReject(auth.loginAdmin({ email: `admin.${lower}`, password: "wrong-pass" }), /ไม่ถูกต้อง/);
  });

  console.log("ขอรหัสรีเซ็ต");
  await test("ไม่ได้ตั้ง SMTP และไม่ได้เปิดโหมด dev → แจ้งว่ายังไม่พร้อม ไม่ออกรหัส", () =>
    withEnv({ ...noSmtp, DEV_SHOW_RESET_CODE: undefined }, async () => {
      await expectReject(auth.requestPasswordReset(email), /ระบบส่งอีเมลยังไม่พร้อม/);
      const u = await prisma.user.findUnique({ where: { id: userId } });
      assert.equal(u.resetToken, null);
    })
  );
  await test("NODE_ENV=production ไม่โชว์รหัสใน response แม้ตั้ง DEV_SHOW_RESET_CODE=1 (ช่องโหว่เดิม)", () =>
    withEnv({ ...devCodes, NODE_ENV: "production" }, () => expectReject(auth.requestPasswordReset(email), /ยังไม่พร้อม/))
  );
  await test("อีเมลที่ไม่มีในระบบได้ข้อความเดียวกัน และไม่มีรหัส (ไม่บอกว่ามีบัญชีนี้ไหม)", () =>
    withEnv(devCodes, async () => {
      const real = await auth.requestPasswordReset(email);
      const fake = await auth.requestPasswordReset(`nobody-${stamp}@example.com`);
      assert.equal(fake.message, real.message);
      assert.equal(fake.devResetCode, undefined);
    })
  );
  await test("เก็บ hash ของรหัสใน DB ไม่ใช่รหัสจริง", () =>
    withEnv(devCodes, async () => {
      const { devResetCode } = await auth.requestPasswordReset(email);
      assert.match(devResetCode, /^\d{6}$/);
      const u = await prisma.user.findUnique({ where: { id: userId } });
      assert.notEqual(u.resetToken, devResetCode);
      assert.equal(u.resetToken.length, 64);
    })
  );

  await test("ตั้ง Brevo แล้วแต่ key ใช้ไม่ได้ → บอกผู้ใช้ว่าส่งอีเมลไม่สำเร็จ (ยิง API จริง ไม่ค้าง)", () =>
    withEnv({ ...noSmtp, BREVO_API_KEY: "invalid-key-for-test", MAIL_FROM: "KU VIN <noreply@example.com>" }, () =>
      expectReject(auth.requestPasswordReset(email), /ส่งอีเมลไม่สำเร็จ/)
    )
  );

  console.log("ตั้งรหัสผ่านใหม่");
  await test("รหัสผ่านใหม่สั้นเกินไปถูกปฏิเสธโดยไม่เสียโควตากรอกรหัส", () =>
    withEnv(devCodes, async () => {
      const { devResetCode } = await auth.requestPasswordReset(email);
      await expectReject(auth.resetPassword({ email, code: devResetCode, newPassword: "short" }), /อย่างน้อย 8/);
      const u = await prisma.user.findUnique({ where: { id: userId } });
      assert.equal(u.resetAttempts, 0);
    })
  );
  await test("กรอกผิดครบ 5 ครั้ง รหัสที่ถูกก็ใช้ไม่ได้แล้ว (กันสุ่มเดา 6 หลัก)", () =>
    withEnv(devCodes, async () => {
      const { devResetCode } = await auth.requestPasswordReset(email);
      const wrong = devResetCode === "000000" ? "111111" : "000000";
      for (let i = 0; i < 5; i++) {
        await expectReject(auth.resetPassword({ email, code: wrong, newPassword: "newpass123" }), /ไม่ถูกต้อง/);
      }
      await expectReject(auth.resetPassword({ email, code: devResetCode, newPassword: "newpass123" }), /เกินจำนวนครั้ง/);
    })
  );
  await test("ยิงเดาพร้อมกัน 20 ครั้งก็หักโควตาได้ไม่เกิน 5", () =>
    withEnv(devCodes, async () => {
      const { devResetCode } = await auth.requestPasswordReset(email);
      const wrong = devResetCode === "000000" ? "111111" : "000000";
      await Promise.allSettled(
        Array.from({ length: 20 }, () => auth.resetPassword({ email, code: wrong, newPassword: "newpass123" }))
      );
      const u = await prisma.user.findUnique({ where: { id: userId } });
      assert.equal(u.resetAttempts, 5);
    })
  );
  await test("รหัสหมดอายุใช้ไม่ได้", () =>
    withEnv(devCodes, async () => {
      const { devResetCode } = await auth.requestPasswordReset(email);
      await prisma.user.update({ where: { id: userId }, data: { resetTokenExpiresAt: new Date(Date.now() - 1000) } });
      await expectReject(auth.resetPassword({ email, code: devResetCode, newPassword: "newpass123" }), /หมดอายุ/);
    })
  );
  await test("ขอรหัสใหม่แล้วรหัสเก่าใช้ไม่ได้", () =>
    withEnv(devCodes, async () => {
      const { devResetCode: first } = await auth.requestPasswordReset(email);
      assert.match(first, /^\d{6}$/);
      let second = first;
      // สุ่มได้รหัสเดิมซ้ำโอกาส 1 ในล้าน — ขอใหม่จนต่าง (จำกัดรอบไว้ กัน loop ไม่จบถ้ามีอะไรผิดพลาด)
      for (let i = 0; i < 5 && second === first; i++) ({ devResetCode: second } = await auth.requestPasswordReset(email));
      assert.notEqual(second, first);
      await expectReject(auth.resetPassword({ email, code: first, newPassword: "newpass123" }), /ไม่ถูกต้อง/);
    })
  );
  await test("รหัสถูก → เปลี่ยนรหัสผ่านได้ ล็อกอินด้วยรหัสใหม่ได้ รหัสเดิมใช้ไม่ได้ และใช้รหัสซ้ำไม่ได้", () =>
    withEnv(devCodes, async () => {
      const { devResetCode } = await auth.requestPasswordReset(lower.toUpperCase());
      await auth.resetPassword({ email, code: devResetCode, newPassword: "newpass123" });
      await auth.loginUser({ email, password: "newpass123" });
      await expectReject(auth.loginUser({ email, password: "oldpass123" }), /ไม่ถูกต้อง/);
      await expectReject(auth.resetPassword({ email, code: devResetCode, newPassword: "another123" }), /ไม่ถูกต้อง/);
    })
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: `kuvin.test.${stamp}`, mode: "insensitive" } } });
    await prisma.admin.deleteMany({ where: { email: { contains: `kuvin.test.${stamp}`, mode: "insensitive" } } });
    await prisma.$disconnect();
    console.log(`\n${passed} tests passed`);
  });
