const asyncHandler = require("../utils/asyncHandler");
const userService = require("../services/user.service");

exports.updateFcmToken = asyncHandler(async (req, res) => {
  const user = await userService.updateFcmToken(req.auth.id, req.body.fcmToken);
  res.json(user);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.auth.id, req.body);
  res.json(user);
});
