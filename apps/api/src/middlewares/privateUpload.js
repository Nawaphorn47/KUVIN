const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const ApiError = require("../utils/ApiError");

// ไฟล์ส่วนตัว (เช่น เซลฟี่ยืนยันตัวตนผู้โดยสาร) — แยกโฟลเดอร์จาก uploads/ ที่เสิร์ฟสาธารณะ
// เปิดดูได้ผ่าน API ที่ตรวจสิทธิ์แล้วเท่านั้น (ดู GET /api/admin/users/:id/selfie)
const PRIVATE_DIR = path.join(__dirname, "..", "..", "uploads-private");
fs.mkdirSync(PRIVATE_DIR, { recursive: true });

const ALLOWED_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const uploader = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PRIVATE_DIR),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_MIME[file.mimetype]}`),
  }),
  fileFilter: (req, file, cb) =>
    ALLOWED_MIME[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest("รองรับเฉพาะรูป JPEG/PNG/WEBP เท่านั้น")),
  limits: { fileSize: 5 * 1024 * 1024 },
});

uploader.PRIVATE_DIR = PRIVATE_DIR;

// path ของไฟล์ในโฟลเดอร์ส่วนตัว — รับแค่ชื่อไฟล์ที่ระบบตั้งเอง กัน path traversal จากค่าที่หลุดเข้า DB
uploader.resolve = (fileName) => {
  if (!fileName || path.basename(fileName) !== fileName) return null;
  return path.join(PRIVATE_DIR, fileName);
};

module.exports = uploader;
