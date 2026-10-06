const asyncHandler = require("../utils/asyncHandler");
const landmarkService = require("../services/landmark.service");

exports.list = asyncHandler(async (req, res) => {
  const { popular, q, areaId } = req.query;
  const landmarks = await landmarkService.listLandmarks({
    areaId,
    popularOnly: popular === "true",
    query: q,
  });
  res.json(landmarks);
});
