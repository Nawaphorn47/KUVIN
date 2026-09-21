const ApiError = require("../utils/ApiError");

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, ...(err.code && { code: err.code }) });
  }

  if (err?.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE" ? "ไฟล์มีขนาดใหญ่เกินไป (จำกัด 5MB)" : err.message;
    return res.status(400).json({ error: message });
  }

  if (err?.code === "P2002") {
    return res.status(409).json({ error: `Duplicate value for: ${err.meta?.target ?? "field"}` });
  }
  if (err?.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = { notFound, errorHandler };
