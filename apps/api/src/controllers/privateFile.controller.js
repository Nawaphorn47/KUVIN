const fs = require("fs");
const ApiError = require("../utils/ApiError");
const privateUpload = require("../middlewares/privateUpload");
const { fileFromToken } = require("../utils/privateFiles");

exports.serve = (req, res, next) => {
  const p = privateUpload.resolve(fileFromToken(req.params.token));
  if (!p || !fs.existsSync(p)) return next(ApiError.notFound("ลิงก์หมดอายุหรือไม่พบไฟล์"));
  res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  res.sendFile(p);
};
