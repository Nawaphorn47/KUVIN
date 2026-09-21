// wraps an async route/controller so thrown errors reach the error-handling middleware
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
