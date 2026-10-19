// ไฟล์ส่วนตัว (เอกสารคนขับ/เซลฟี่ผู้โดยสาร) อยู่ใน uploads-private/ ไม่ถูกเสิร์ฟสาธารณะ
// ใน DB เก็บเป็น "private:<ชื่อไฟล์>" — เวลาส่งให้คนที่มีสิทธิ์ (เจ้าของ/แอดมิน) แปลงเป็นลิงก์ที่เซ็นแล้ว อายุสั้น
// (/api/private-files/<token>) ให้ <img> เปิดได้โดยไม่ต้องแนบ header — ลิงก์หลุดไปก็ใช้ได้แค่ไม่กี่นาที
const { signToken, verifyToken } = require("./jwt");

const PREFIX = "private:";
const LINK_TTL = "15m";

const isPrivateRef = (v) => typeof v === "string" && v.startsWith(PREFIX);
const toRef = (fileName) => `${PREFIX}${fileName}`;
const fileOf = (ref) => (isPrivateRef(ref) ? ref.slice(PREFIX.length) : null);

function signedPath(ref) {
  const file = fileOf(ref);
  if (!file) return ref ?? null; // ข้อมูลเก่าที่เป็น URL สาธารณะ — ส่งต่อตามเดิม
  return `/api/private-files/${signToken({ purpose: "file", file }, { expiresIn: LINK_TTL })}`;
}

function fileFromToken(token) {
  try {
    const payload = verifyToken(token);
    return payload.purpose === "file" ? payload.file : null;
  } catch {
    return null;
  }
}

module.exports = { isPrivateRef, toRef, fileOf, signedPath, fileFromToken };
