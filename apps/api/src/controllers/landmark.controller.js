const asyncHandler = require("../utils/asyncHandler");
const landmarkService = require("../services/landmark.service");

exports.list = asyncHandler(async (req, res) => {
  const { popular, q } = req.query;
  const landmarks = await landmarkService.listLandmarks({
    popularOnly: popular === "true",
    query: q,
  });
  res.json(landmarks);
});
