const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("ไม่พบไฟล์ที่อัปโหลด (field name ต้องเป็น 'file')");

  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});
