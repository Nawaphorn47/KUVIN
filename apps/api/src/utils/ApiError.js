class ApiError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code; // ให้ client แยกกรณีพิเศษได้ เช่น ACCOUNT_SUSPENDED
  }

  static badRequest(message) {
    return new ApiError(400, message);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }
  static forbidden(message = "Forbidden", code) {
    return new ApiError(403, message, code);
  }
  static notFound(message = "Not found") {
    return new ApiError(404, message);
  }
  static conflict(message) {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
