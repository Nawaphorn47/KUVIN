const rateLimit = require("express-rate-limit");

// กัน brute-force เดารหัสผ่าน — จำกัดเฉพาะ endpoint auth ไม่แตะ endpoint อื่น
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่อีกครั้งภายหลัง" },
});

// หน้าสาธารณะที่ไม่ต้องล็อกอิน (เช่น ลิงก์แชร์ทริป ที่หน้าเว็บดึงซ้ำทุกไม่กี่วินาที)
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "เรียกดูบ่อยเกินไป รอสักครู่แล้วลองใหม่" },
});

module.exports = { authLimiter, publicLimiter };
