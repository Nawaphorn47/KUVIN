const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "change_me";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// opts.expiresIn ใช้กับตั๋วอายุสั้น (เช่น ตั๋วสมัครหลังยืนยัน OTP) — ปกติใช้อายุ token ล็อกอิน
function signToken(payload, opts = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: opts.expiresIn ?? EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
