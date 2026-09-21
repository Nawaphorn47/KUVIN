const ApiError = require("../utils/ApiError");
const { verifyToken } = require("../utils/jwt");
const { assertNotSuspended } = require("../utils/accountStatus");

// requireAuth(['user']) / requireAuth(['driver','admin']) / requireAuth() for "any authenticated role"
function requireAuth(roles = []) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(ApiError.unauthorized("Missing bearer token"));
    }

    let payload;
    try {
      payload = verifyToken(header.slice("Bearer ".length));
    } catch {
      return next(ApiError.unauthorized("Invalid or expired token"));
    }

    if (roles.length && !roles.includes(payload.role)) {
      return next(ApiError.forbidden("Insufficient role"));
    }

    try {
      await assertNotSuspended(payload.role, payload.id); // บัญชีที่ถูกระงับใช้ token เดิมต่อไม่ได้
    } catch (err) {
      return next(err);
    }

    req.auth = payload; // { id, role }
    next();
  };
}

module.exports = requireAuth;
