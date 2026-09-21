const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { getRoute } = require("../utils/routing");

const num = (v) => (v === undefined || v === "" ? NaN : Number(v));
const validPoint = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// GET /routes?fromLat&fromLng&toLat&toLng — เส้นทางถนนจริง + ระยะทาง + เวลาเดินทาง (ใช้วาดแผนที่/แสดง ETA)
exports.get = asyncHandler(async (req, res) => {
  const from = { lat: num(req.query.fromLat), lng: num(req.query.fromLng) };
  const to = { lat: num(req.query.toLat), lng: num(req.query.toLng) };
  if (!validPoint(from.lat, from.lng) || !validPoint(to.lat, to.lng)) {
    throw ApiError.badRequest("ต้องระบุพิกัด fromLat, fromLng, toLat, toLng เป็นตัวเลขที่ถูกต้อง");
  }

  const route = await getRoute(from, to);
  res.json({
    source: route.source,
    distanceKm: Number(route.distanceKm.toFixed(2)),
    durationMin: Math.max(1, Math.round(route.durationMin)),
    coordinates: route.coordinates,
  });
});
