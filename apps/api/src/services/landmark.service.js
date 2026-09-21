const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

async function listLandmarks({ popularOnly = false, query } = {}) {
  return prisma.landmark.findMany({
    where: {
      ...(popularOnly ? { isPopular: true } : {}),
      ...(query
        ? { OR: [{ name: { contains: query } }, { detail: { contains: query } }] }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

// ---- admin: จัดการสถานที่ ----
// พิกัดต้องอยู่ในช่วงที่เป็นไปได้ในไทย (กันพิมพ์สลับ lat/lng หรือ typo ที่ทำให้คำนวณค่าโดยสารเพี้ยนทั้งระบบ)
const LAT_RANGE = [5, 21];
const LNG_RANGE = [97, 106];

function cleanInput(body, { partial }) {
  const out = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) throw ApiError.badRequest("ต้องระบุชื่อสถานที่");
    out.name = body.name.trim();
  }
  if (body.detail !== undefined) out.detail = body.detail ? String(body.detail).trim() || null : null;
  if (body.isPopular !== undefined) out.isPopular = Boolean(body.isPopular);
  if (body.coordsVerified !== undefined) out.coordsVerified = Boolean(body.coordsVerified);

  if (!partial || body.lat !== undefined || body.lng !== undefined) {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw ApiError.badRequest("พิกัด lat/lng ต้องเป็นตัวเลข");
    if (lat < LAT_RANGE[0] || lat > LAT_RANGE[1] || lng < LNG_RANGE[0] || lng > LNG_RANGE[1]) {
      throw ApiError.badRequest("พิกัดอยู่นอกประเทศไทย กรุณาตรวจสอบว่าใส่ lat/lng ไม่สลับกัน");
    }
    out.lat = lat;
    out.lng = lng;
  }
  return out;
}

async function createLandmark(body) {
  return prisma.landmark.create({ data: cleanInput(body, { partial: false }) });
}

async function updateLandmark(id, body) {
  const existing = await prisma.landmark.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("ไม่พบสถานที่นี้");
  return prisma.landmark.update({ where: { id }, data: cleanInput(body, { partial: true }) });
}

// คำขอที่เคยจองแล้วเก็บพิกัดของตัวเองไว้ในแถวคำขอ (ไม่ได้อ้างอิงตาราง landmarks) จึงลบสถานที่ได้โดยประวัติไม่กระทบ
async function deleteLandmark(id) {
  const existing = await prisma.landmark.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("ไม่พบสถานที่นี้");
  await prisma.landmark.delete({ where: { id } });
}

module.exports = { listLandmarks, createLandmark, updateLandmark, deleteLandmark };
