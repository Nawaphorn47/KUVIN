const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const ApiError = require("../utils/ApiError");

// ไฟล์ส่วนตัว (เอกสารคนขับ/เซลฟี่ผู้โดยสาร) — เปิดดูได้ผ่านลิงก์ที่เซ็นแล้วเท่านั้น (ดู utils/privateFiles.js)
// อยู่ใต้ uploads/.private เพื่อให้อยู่ใน volume เดียวกับ uploads/ (Railway ให้ volume ได้ service ละ 1 ก้อน ถ้าแยกโฟลเดอร์
// ออกไป deploy ใหม่แล้วไฟล์หาย) — express.static ตั้ง dotfiles: "deny" ไว้ จึงเปิดผ่าน /uploads/.private/... ไม่ได้
const PRIVATE_DIR = process.env.PRIVATE_UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads", ".private");
fs.mkdirSync(PRIVATE_DIR, { recursive: true });

const ALLOWED_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const uploader = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PRIVATE_DIR),
    // ขึ้นต้นด้วยเจ้าของไฟล์ (role-id) — ตอนส่งเอกสารตรวจได้ว่าเป็นไฟล์ที่คนนี้อัปโหลดเอง อ้างไฟล์ของคนอื่นไม่ได้
    filename: (req, file, cb) =>
      cb(null, `${req.auth?.role ?? "anon"}-${req.auth?.id ?? "x"}-${crypto.randomUUID()}${ALLOWED_MIME[file.mimetype]}`),
  }),
  fileFilter: (req, file, cb) =>
    ALLOWED_MIME[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest("รองรับเฉพาะรูป JPEG/PNG/WEBP เท่านั้น")),
  limits: { fileSize: 5 * 1024 * 1024 },
});

uploader.PRIVATE_DIR = PRIVATE_DIR;
uploader.ownerPrefix = (role, id) => `${role}-${id}-`;

// path ของไฟล์ในโฟลเดอร์ส่วนตัว — รับแค่ชื่อไฟล์ที่ระบบตั้งเอง กัน path traversal จากค่าที่หลุดเข้า DB
uploader.resolve = (fileName) => {
  // ชื่อไฟล์ที่ระบบตั้งมีแค่ตัวอักษร ตัวเลข - และนามสกุลรูป (role-id-uuid.ext) — อย่างอื่น (/, \, ..) ปฏิเสธหมดทุก OS
  if (typeof fileName !== "string" || !/^[A-Za-z0-9-]+\.(jpg|png|webp)$/.test(fileName)) return null;
  return path.join(PRIVATE_DIR, fileName);
};

module.exports = uploader;
