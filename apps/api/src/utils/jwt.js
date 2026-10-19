const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "change_me";

// production ห้ามใช้ค่าเริ่มต้น/ค่าสั้น — ใครรู้ secret ปลอม token เป็นใครก็ได้ (รวมแอดมิน) ให้ server ไม่ยอมเปิดดีกว่า
// สร้างค่าใหม่: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
if (process.env.NODE_ENV === "production" && (SECRET === "change_me" || SECRET.length < 32)) {
  throw new Error("JWT_SECRET ต้องตั้งเป็นค่าสุ่มยาวอย่างน้อย 32 ตัวอักษรก่อนเปิดใช้งานจริง");
}
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// opts.expiresIn ใช้กับตั๋วอายุสั้น (เช่น ตั๋วสมัครหลังยืนยัน OTP) — ปกติใช้อายุ token ล็อกอิน
function signToken(payload, opts = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: opts.expiresIn ?? EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
