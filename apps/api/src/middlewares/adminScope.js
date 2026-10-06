// ขอบเขตข้อมูลของแอดมินแต่ละคน — ใช้ต่อจาก requireAuth(["admin"]) บน /api/admin/*
//   SUPER_ADMIN : เห็นทุกพื้นที่ เลือกดูเฉพาะพื้นที่เดียวได้ด้วย header "X-Area-Id" (ไม่ส่ง = ทุกพื้นที่)
//   AREA_ADMIN  : เห็น/แก้ได้เฉพาะพื้นที่ของตัวเองเสมอ (ไม่สนใจ X-Area-Id ที่ส่งมา)
// req.adminScope = { adminId, isSuper, areaId }  — areaId = null หมายถึงทุกพื้นที่ (super เท่านั้น)
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

async function adminScope(req, res, next) {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.auth.id },
      select: { id: true, role: true, areaId: true },
    });
    if (!admin) throw ApiError.unauthorized("ไม่พบบัญชีผู้ดูแลระบบนี้");

    const isSuper = admin.role === "SUPER_ADMIN";
    if (!isSuper && !admin.areaId) throw ApiError.forbidden("บัญชีนี้ยังไม่ได้ผูกกับพื้นที่ใด กรุณาติดต่อ super admin");

    req.adminScope = {
      adminId: admin.id,
      isSuper,
      areaId: isSuper ? req.get("x-area-id") || null : admin.areaId,
    };
    next();
  } catch (err) {
    next(err);
  }
}

function requireSuper(req, res, next) {
  if (!req.adminScope?.isSuper) return next(ApiError.forbidden("เฉพาะ super admin เท่านั้น"));
  next();
}

// where สำหรับตารางที่มีคอลัมน์ areaId
const areaWhere = (scope) => (scope.areaId ? { areaId: scope.areaId } : {});

// ข้อมูลที่อยู่นอกขอบเขตตอบว่า "ไม่พบ" (ไม่บอกว่ามีอยู่ในพื้นที่อื่น)
function assertInScope(scope, areaId, notFoundMessage = "ไม่พบข้อมูลนี้") {
  if (scope.areaId && areaId !== scope.areaId) throw ApiError.notFound(notFoundMessage);
}

// พื้นที่ปลายทางตอนสร้างข้อมูลใหม่ (เช่น สถานที่): แอดมินพื้นที่ = พื้นที่ตัวเอง, super = ต้องระบุ
function targetArea(scope, requestedAreaId) {
  if (!scope.isSuper) return scope.areaId;
  const areaId = requestedAreaId || scope.areaId;
  if (!areaId) throw ApiError.badRequest("กรุณาเลือกพื้นที่ก่อน");
  return areaId;
}

module.exports = { adminScope, requireSuper, areaWhere, assertInScope, targetArea };
