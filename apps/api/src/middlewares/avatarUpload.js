const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const ApiError = require("../utils/ApiError");
const { UPLOAD_DIR } = require("./upload");

// รูปโปรไฟล์ — เก็บที่ uploads/avatars (เสิร์ฟสาธารณะ ชื่อไฟล์เป็น UUID เดาไม่ได้) เพราะอีกฝ่ายในทริปต้องเห็นรูปนี้
// ต่างจากเซลฟี่ยืนยันตัวตน/เอกสารคนขับซึ่งเป็นไฟล์ส่วนตัว (middlewares/privateUpload.js)
const AVATAR_DIR = path.join(UPLOAD_DIR, "avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const ALLOWED_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, AVATAR_DIR),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_MIME[file.mimetype]}`),
  }),
  fileFilter: (req, file, cb) =>
    ALLOWED_MIME[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest("รองรับเฉพาะไฟล์รูปภาพ JPEG/PNG/WEBP เท่านั้น")),
  limits: { fileSize: 2 * 1024 * 1024 }, // แอปย่อรูปก่อนส่งอยู่แล้ว (≤ 512px) 2MB เหลือเฟือ
});

avatarUpload.AVATAR_DIR = AVATAR_DIR;
module.exports = avatarUpload;
