const rateLimit = require("express-rate-limit");

// กัน brute-force เดารหัสผ่าน — จำกัดเฉพาะ endpoint auth ไม่แตะ endpoint อื่น
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่อีกครั้งภายหลัง" },
});

module.exports = { authLimiter };
