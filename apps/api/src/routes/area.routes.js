// วิทยาเขตที่ให้บริการ (สาธารณะ — ไม่ต้องล็อกอิน): แอปใช้เลือกวิทยาเขตจาก GPS, โชว์ชื่อ/โลโก้/เบอร์ฉุกเฉิน และหน้าสมัครคนขับ
const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const areaService = require("../services/area.service");

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await areaService.listActive());
  })
);

// วิทยาเขตที่ครอบคลุมพิกัดนี้ (ใกล้ที่สุด) — 404 = อยู่นอกทุกวิทยาเขต
router.get(
  "/resolve",
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw ApiError.badRequest("ต้องระบุ lat และ lng เป็นตัวเลข");
    const area = await areaService.findForPoint({ lat, lng });
    if (!area) throw ApiError.notFound("ตำแหน่งนี้อยู่นอกวิทยาเขตที่ให้บริการ");
    res.json(await areaService.getPublic(area.id));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await areaService.getPublic(req.params.id));
  })
);

module.exports = router;
