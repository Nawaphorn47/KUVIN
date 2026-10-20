const asyncHandler = require("../utils/asyncHandler");
const userService = require("../services/user.service");

exports.updateFcmToken = asyncHandler(async (req, res) => {
  const user = await userService.updateFcmToken(req.auth.id, req.body.fcmToken);
  res.json(user);
});

exports.uploadAvatar = asyncHandler(async (req, res) => {
  res.json(await userService.saveAvatar(req.auth, req.file));
});

exports.deleteAvatar = asyncHandler(async (req, res) => {
  res.json(await userService.removeAvatar(req.auth));
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.auth.id, req.body);
  res.json(user);
});
