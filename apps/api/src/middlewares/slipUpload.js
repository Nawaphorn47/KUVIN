const multer = require("multer");
const ApiError = require("../utils/ApiError");

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// เก็บสลิปไว้ใน memory เท่านั้น ไม่เขียนลงดิสก์ (โฟลเดอร์ uploads เปิดสาธารณะ และสลิปมีข้อมูลบัญชีธนาคาร) —
// ส่งต่อให้ผู้ให้บริการตรวจสลิปแล้วทิ้งเมื่อจบ request (ดู services/payment.service.js)
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(ApiError.badRequest("รองรับเฉพาะไฟล์รูปภาพ JPEG/PNG/WEBP เท่านั้น"));
    }
    cb(null, true);
  },
});
