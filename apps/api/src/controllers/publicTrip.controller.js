const asyncHandler = require("../utils/asyncHandler");
const safety = require("../services/tripSafety.service");

exports.view = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await safety.publicShareView(req.params.token));
});
