// ตรวจรูปแบบอีเมลแบบง่าย: มี @ ตัวเดียว ส่วนหน้า @ ไม่ว่าง ส่วนโดเมนมีจุดที่มีตัวอักษรทั้งสองข้าง และไม่มีช่องว่าง
// (เงื่อนไขเดียวกับ /^[^\s@]+@[^\s@]+\.[^\s@]+$/ เดิม) — เขียนเป็นโค้ดธรรมดาแทน regex เพราะ regex นั้น backtrack
// หนักขึ้นแบบยกกำลังเมื่อมีคนส่งข้อความยาวมาก ๆ เข้ามา (ReDoS) และจำกัดความยาวตามมาตรฐานอีเมลที่ 254 ตัวอักษร
const MAX_EMAIL_LENGTH = 254;

function isValidEmail(email) {
  if (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH || /\s/.test(email)) return false;
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@")) return false;
  const domain = email.slice(at + 1);
  return domain.length >= 3 && domain.slice(1, -1).includes(".");
}

module.exports = { isValidEmail, MAX_EMAIL_LENGTH };
