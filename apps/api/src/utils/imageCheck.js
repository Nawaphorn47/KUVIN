const fs = require("fs");
const ApiError = require("./ApiError");

// ตรวจ "เนื้อไฟล์" ว่าเป็นรูปจริง (magic bytes) ไม่เชื่อ mimetype ที่ client ส่งมาอย่างเดียว — กันอัปโหลด HTML/สคริปต์
// ปลอมนามสกุลเป็นรูปแล้วเอาไปหลอกเปิดในเบราว์เซอร์ ไม่ผ่าน = ลบไฟล์ทิ้งทันที
const SIGNATURES = [
  (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, // JPEG
  (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), // PNG
  (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP", // WEBP
];

async function assertImageFile(filePath) {
  const fh = await fs.promises.open(filePath, "r");
  const buf = Buffer.alloc(12);
  try {
    await fh.read(buf, 0, 12, 0);
  } finally {
    await fh.close();
  }
  if (!SIGNATURES.some((ok) => ok(buf))) {
    await fs.promises.unlink(filePath).catch(() => {});
    throw ApiError.badRequest("ไฟล์นี้ไม่ใช่รูปภาพ JPEG/PNG/WEBP");
  }
}

// ใช้ต่อท้าย multer: ตรวจไฟล์ที่เพิ่งบันทึก (ไม่มีไฟล์ = ปล่อยให้ controller ตอบเอง)
const requireRealImage = (req, res, next) => {
  if (!req.file?.path) return next();
  assertImageFile(req.file.path).then(() => next(), next);
};

module.exports = { assertImageFile, requireRealImage };
