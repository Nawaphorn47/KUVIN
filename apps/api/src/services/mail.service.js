// ส่งอีเมลผ่าน SMTP (ผู้ให้บริการไหนก็ได้ เช่น Gmail + App Password, Brevo, Mailgun) — ตั้งค่าใน .env:
//   SMTP_HOST, SMTP_PORT (ค่าเริ่มต้น 587), SMTP_USER, SMTP_PASS, MAIL_FROM (ไม่ตั้ง = ใช้ SMTP_USER)
// ใช้ส่งรหัสรีเซ็ตรหัสผ่าน (auth.service.js) — ยังไม่ตั้งค่า = isConfigured() เป็น false แล้วฝั่งนั้นจะแจ้งผู้ใช้เอง
const nodemailer = require("nodemailer");

let transporter = null;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS ตั้งแต่ต้น, 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  return getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { isConfigured, sendMail };
