const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");

exports.registerUser = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json(result);
});

exports.loginUser = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  res.json(result);
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json(result);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json(result);
});

exports.registerDriver = asyncHandler(async (req, res) => {
  const result = await authService.registerDriver(req.body);
  res.status(201).json(result);
});

exports.loginDriver = asyncHandler(async (req, res) => {
  const result = await authService.loginDriver(req.body);
  res.json(result);
});

exports.loginAdmin = asyncHandler(async (req, res) => {
  const result = await authService.loginAdmin(req.body);
  res.json(result);
});

exports.me = asyncHandler(async (req, res) => {
  const profile = await authService.getMe(req.auth);
  res.json(profile);
});
