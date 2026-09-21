const ApiError = require("../utils/ApiError");
const { verifyToken } = require("../utils/jwt");

// requireAuth(['user']) / requireAuth(['driver','admin']) / requireAuth() for "any authenticated role"
function requireAuth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(ApiError.unauthorized("Missing bearer token"));
    }

    try {
      const payload = verifyToken(header.slice("Bearer ".length));
      if (roles.length && !roles.includes(payload.role)) {
        return next(ApiError.forbidden("Insufficient role"));
      }
      req.auth = payload; // { id, role }
      next();
    } catch {
      next(ApiError.unauthorized("Invalid or expired token"));
    }
  };
}

module.exports = requireAuth;
