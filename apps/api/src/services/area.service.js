// พื้นที่ให้บริการ (tenant) — ค้นหาพื้นที่จากพิกัด + จัดการพื้นที่ (super admin สร้าง, แอดมินพื้นที่แก้ของตัวเอง)
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { distanceKm, areaCenter, isWithinService } = require("../utils/geo");

// ทุกฟิลด์ของพื้นที่เปิดเผยได้ (ไม่มีข้อมูลลับ) — แอปผู้โดยสารใช้คิดราคา โชว์ชื่อ/โลโก้ และเบอร์ฉุกเฉิน
const PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  displayName: true,
  logoUrl: true,
  centerLat: true,
  centerLng: true,
  flatRadiusKm: true,
  serviceRadiusKm: true,
  flatFare: true,
  ratePerKm: true,
  minFare: true,
  emergencyContacts: true,
};

async function listActive() {
  return prisma.area.findMany({ where: { isActive: true }, select: PUBLIC_SELECT, orderBy: { displayName: "asc" } });
}

async function getPublic(id) {
  const area = await prisma.area.findFirst({ where: { id, isActive: true }, select: PUBLIC_SELECT });
  if (!area) throw ApiError.notFound("ไม่พบพื้นที่ให้บริการนี้");
  return area;
}

// พื้นที่ที่ใกล้ที่สุดที่ครอบคลุมจุดนี้ (null = อยู่นอกทุกพื้นที่)
async function findForPoint(point) {
  const areas = await prisma.area.findMany({ where: { isActive: true } });
  return (
    areas
      .filter((a) => isWithinService(a, point))
      .sort((a, b) => distanceKm(areaCenter(a), point) - distanceKm(areaCenter(b), point))[0] ?? null
  );
}

// พื้นที่ที่จะให้บริการทริปนี้ — ผู้โดยสารเลือกพื้นที่เองได้ (preferredAreaId) แต่จุดรับต้องอยู่ในระยะที่วินพื้นที่นั้นไปรับได้
async function resolveForPickup(pickup, preferredAreaId) {
  if (preferredAreaId) {
    const preferred = await prisma.area.findFirst({ where: { id: preferredAreaId, isActive: true } });
    if (preferred && isWithinService(preferred, pickup)) return preferred;
  }
  const area = await findForPoint(pickup);
  if (!area) {
    throw ApiError.unprocessable("จุดรับอยู่นอกพื้นที่ให้บริการ กรุณาเลือกจุดรับใหม่", "OUT_OF_SERVICE_AREA");
  }
  return area;
}

// ---------------------------------------------------------------------------
// admin: จัดการพื้นที่
// ---------------------------------------------------------------------------
const LAT_RANGE = [5, 21]; // ประเทศไทย (กันพิมพ์ lat/lng สลับกัน)
const LNG_RANGE = [97, 106];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function num(value, label, { min = 0, max = Infinity } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw ApiError.badRequest(`${label} ไม่ถูกต้อง`);
  return n;
}

function text(value, label, { required = true, max = 120 } = {}) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) {
    if (required) throw ApiError.badRequest(`ต้องระบุ${label}`);
    return null;
  }
  if (s.length > max) throw ApiError.badRequest(`${label}ยาวเกิน ${max} ตัวอักษร`);
  return s;
}

function cleanContacts(value) {
  if (!Array.isArray(value)) throw ApiError.badRequest("เบอร์ฉุกเฉินต้องเป็นรายการ");
  if (value.length > 10) throw ApiError.badRequest("ใส่เบอร์ฉุกเฉินได้ไม่เกิน 10 เบอร์");
  return value.map((c, i) => {
    const label = text(c?.label, `ชื่อเบอร์ฉุกเฉินลำดับที่ ${i + 1}`, { max: 60 });
    const phone = text(c?.phone, `เบอร์โทรลำดับที่ ${i + 1}`, { max: 20 });
    if (!/^[0-9+\-\s]+$/.test(phone)) throw ApiError.badRequest(`เบอร์โทรลำดับที่ ${i + 1} มีตัวอักษรที่ไม่ใช่ตัวเลข`);
    return { label, phone };
  });
}

function cleanArea(body, { partial }) {
  const out = {};
  const has = (k) => !partial || body[k] !== undefined;

  if (has("slug")) {
    const slug = text(body.slug, "รหัสพื้นที่ (slug)", { max: 40 })?.toLowerCase();
    if (!SLUG_RE.test(slug)) throw ApiError.badRequest("รหัสพื้นที่ใช้ได้เฉพาะ a-z, 0-9 และขีด - เช่น ku-kps");
    out.slug = slug;
  }
  if (has("name")) out.name = text(body.name, "ชื่อพื้นที่");
  if (has("displayName")) out.displayName = text(body.displayName, "ชื่อที่แสดงในแอป", { max: 40 });
  if (body.logoUrl !== undefined) out.logoUrl = text(body.logoUrl, "โลโก้", { required: false, max: 500 });

  if (has("centerLat") || has("centerLng")) {
    out.centerLat = num(body.centerLat, "ละติจูดจุดกลาง", { min: LAT_RANGE[0], max: LAT_RANGE[1] });
    out.centerLng = num(body.centerLng, "ลองจิจูดจุดกลาง", { min: LNG_RANGE[0], max: LNG_RANGE[1] });
  }
  // ฟิลด์ที่มีค่าเริ่มต้นใน DB (รัศมี/ค่าโดยสาร) ไม่บังคับตอนสร้าง — ตรวจเฉพาะเมื่อส่งมา
  const given = (k) => body[k] !== undefined && body[k] !== "";
  if (given("flatRadiusKm")) out.flatRadiusKm = num(body.flatRadiusKm, "รัศมีเขตเหมาจ่าย", { min: 0.1, max: 50 });
  if (given("serviceRadiusKm")) out.serviceRadiusKm = num(body.serviceRadiusKm, "รัศมีพื้นที่ให้บริการ", { min: 0.1, max: 100 });
  if (given("flatFare")) out.flatFare = num(body.flatFare, "ค่าโดยสารเหมาจ่าย", { max: 10000 });
  if (given("ratePerKm")) out.ratePerKm = num(body.ratePerKm, "ค่าโดยสารต่อกิโลเมตร", { max: 1000 });
  if (given("minFare")) out.minFare = num(body.minFare, "ค่าโดยสารขั้นต่ำ", { max: 10000 });
  if (body.emergencyContacts !== undefined) out.emergencyContacts = cleanContacts(body.emergencyContacts);
  if (body.isActive !== undefined) out.isActive = Boolean(body.isActive);
  return out;
}

function assertRadii(area) {
  if (area.serviceRadiusKm < area.flatRadiusKm) {
    throw ApiError.badRequest("รัศมีพื้นที่ให้บริการต้องไม่น้อยกว่ารัศมีเขตเหมาจ่าย");
  }
}

async function listAreas(scope) {
  return prisma.area.findMany({
    where: scope.isSuper ? {} : { id: scope.areaId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { drivers: true, landmarks: true, admins: true } } },
  });
}

async function getArea(scope, id) {
  if (!scope.isSuper && id !== scope.areaId) throw ApiError.notFound("ไม่พบพื้นที่นี้");
  const area = await prisma.area.findUnique({ where: { id } });
  if (!area) throw ApiError.notFound("ไม่พบพื้นที่นี้");
  return area;
}

async function createArea(body) {
  const data = cleanArea(body, { partial: false });
  assertRadii({ flatRadiusKm: 2, serviceRadiusKm: 15, ...data });
  try {
    return await prisma.area.create({ data: { emergencyContacts: [], ...data } });
  } catch (err) {
    if (err?.code === "P2002") throw ApiError.conflict("รหัสพื้นที่นี้ถูกใช้แล้ว");
    throw err;
  }
}

// แอดมินพื้นที่แก้ค่าของพื้นที่ตัวเองได้ (ค่าโดยสาร เบอร์ฉุกเฉิน ชื่อ โลโก้ ขอบเขต) แต่เปิด/ปิดพื้นที่และเปลี่ยนรหัสได้เฉพาะ super
async function updateArea(scope, id, body) {
  const existing = await getArea(scope, id);
  const data = cleanArea(body, { partial: true });
  if (!scope.isSuper) {
    delete data.isActive;
    delete data.slug;
  }
  assertRadii({ ...existing, ...data });
  try {
    return await prisma.area.update({ where: { id }, data });
  } catch (err) {
    if (err?.code === "P2002") throw ApiError.conflict("รหัสพื้นที่นี้ถูกใช้แล้ว");
    throw err;
  }
}

module.exports = {
  PUBLIC_SELECT,
  listActive,
  getPublic,
  findForPoint,
  resolveForPickup,
  listAreas,
  getArea,
  createArea,
  updateArea,
};
