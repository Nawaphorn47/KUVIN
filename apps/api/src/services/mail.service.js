// ส่งอีเมล (ใช้ส่งรหัสรีเซ็ตรหัสผ่าน — ดู auth.service.js) — ตั้งค่าใน .env อย่างใดอย่างหนึ่ง:
//
// 1) Brevo (แนะนำบน Railway): BREVO_API_KEY + MAIL_FROM (อีเมลผู้ส่งที่ยืนยันใน Brevo แล้ว เช่น "KU VIN <you@gmail.com>")
//    ส่งผ่าน HTTPS API — Railway แผน Trial/Hobby บล็อกการเชื่อมต่อ SMTP ขาออก (พอร์ต 25/465/587/2525) ทั้งหมด
//    ส่งผ่าน SMTP บน Railway จึงค้างจน timeout; ฟรี 300 ฉบับ/วัน ไม่ต้องมีโดเมนของตัวเอง (ยืนยันอีเมลผู้ส่งอย่างเดียว)
// 2) SMTP (ผู้ให้บริการไหนก็ได้ เช่น Gmail + App Password): SMTP_HOST, SMTP_PORT (ค่าเริ่มต้น 587), SMTP_USER,
//    SMTP_PASS, MAIL_FROM (ไม่ตั้ง = ใช้ SMTP_USER) — ใช้ได้ตอนรันในเครื่อง หรือบน Railway แผน Pro ขึ้นไป
//
// ไม่ได้ตั้งทั้งสองแบบ = isConfigured() เป็น false แล้วฝั่ง auth.service จะแจ้งผู้ใช้ว่าระบบส่งอีเมลยังไม่พร้อม
const nodemailer = require("nodemailer");

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const SEND_TIMEOUT_MS = 15000;

let transporter = null;

function useBrevo() {
  return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM);
}

function useSmtp() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function isConfigured() {
  return useBrevo() || useSmtp();
}

// "KU VIN <you@gmail.com>" หรือ "you@gmail.com" → { name, email }
function parseAddress(value) {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  return match ? { name: match[1] || undefined, email: match[2] } : { email: value.trim() };
}

async function sendViaBrevo({ to, subject, text, html }) {
  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: parseAddress(process.env.MAIL_FROM),
      to: [{ email: to }],
      subject,
      textContent: text,
      ...(html && { htmlContent: html }),
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!res.ok) {
    // ข้อความจาก Brevo บอกสาเหตุตรง ๆ เช่น key ผิด หรืออีเมลผู้ส่งยังไม่ได้ยืนยัน — log ไว้ให้แก้ config ได้
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo ${res.status}: ${detail.slice(0, 300)}`);
  }
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS ตั้งแต่ต้น, 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: SEND_TIMEOUT_MS, // ไม่ให้ request ค้างนานถ้าพอร์ตถูกบล็อก (เช่นบน Railway แผน Hobby)
    });
  }
  return transporter;
}

async function sendMail(message) {
  if (useBrevo()) return sendViaBrevo(message);
  return getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    ...message,
  });
}

module.exports = { isConfigured, sendMail };
