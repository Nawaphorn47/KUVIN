// เทียบ "ผู้รับเงินบนสลิป" กับพร้อมเพย์ของคนขับ
//
// สลิปมักปิดบังเลขบางส่วน (เช่น xxx-xxx-1234) จึงเทียบเฉพาะหลักที่มองเห็น นับจากท้ายเลข และต้องเห็นอย่างน้อย
// MIN_VISIBLE_DIGITS หลักถึงจะถือว่าเทียบได้ — เห็นน้อยกว่านั้นถือว่า "ไม่มีข้อมูลพอ" ไม่ใช่ "ตรงกัน"
// (กันกรณีโอนให้บัญชีอื่นที่เลขท้ายบังเอิญตรงกัน 1-2 หลักแล้วผ่าน)
const MIN_VISIBLE_DIGITS = 4;
const MASK_CHARS = /[xX*•●]/g;

// คืนสตริงที่ตัดตัวคั่นออกและแทนตัวปิดบังด้วย "x"
function canonical(value) {
  return String(value).replace(/[\s\-().]/g, "").replace(MASK_CHARS, "x");
}

// ผลการเทียบ hint หนึ่งค่า: true = ตรง, false = ขัดแย้ง, null = ไม่มีเลขให้เทียบ/เห็นไม่พอ
function compareOne(promptPayId, hint) {
  let h = canonical(hint);
  if (!/\d/.test(h)) return null;

  // เบอร์โทรในรูปแบบสากลของไทย (+66...) → รูปแบบในประเทศ (0...)
  if (promptPayId.length === 10 && promptPayId.startsWith("0")) {
    if (h.startsWith("+66")) h = `0${h.slice(3)}`;
    else if (h.startsWith("66") && h.length === 11) h = `0${h.slice(2)}`;
  }
  h = h.replace(/\+/g, "");

  const n = Math.min(h.length, promptPayId.length);
  let visible = 0;
  for (let i = 1; i <= n; i++) {
    const c = h[h.length - i];
    if (c === "x") continue;
    if (!/\d/.test(c)) return null; // มีตัวอักษรอื่นปนมา (เช่น ชื่อ) ไม่ใช่เลขบัญชี
    if (c !== promptPayId[promptPayId.length - i]) return false;
    visible++;
  }
  return visible >= MIN_VISIBLE_DIGITS ? true : null;
}

// hints = ค่าทุกตัวที่สลิประบุถึงผู้รับ (proxy/เลขบัญชี ฯลฯ)
// คืน "MATCH" | "MISMATCH" | "UNKNOWN"
//  - MATCH    : มีอย่างน้อยหนึ่งค่าที่เห็นเลขพอและตรงกับพร้อมเพย์ของคนขับ
//  - MISMATCH : มีค่าที่เห็นเลขพอ แต่ไม่มีตัวไหนตรงเลย
//  - UNKNOWN  : สลิปไม่ได้ให้เลขที่เทียบได้ — ห้ามยืนยันอัตโนมัติ (ผู้โดยสารอาจโอนเข้าบัญชีตัวเองด้วยยอดเท่ากัน)
function matchReceiver(promptPayId, hints) {
  const results = (hints ?? []).map((h) => compareOne(String(promptPayId), h));
  if (results.includes(true)) return "MATCH";
  if (results.includes(false)) return "MISMATCH";
  return "UNKNOWN";
}

module.exports = { matchReceiver, MIN_VISIBLE_DIGITS };
