// วิทยาเขตที่ให้บริการ (tenant) — ค้นหาวิทยาเขตจากพิกัด + จัดการวิทยาเขต (super admin สร้าง, แอดมินวิทยาเขตแก้ของตัวเอง)
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { distanceKm, areaCenter, isWithinService } = require("../utils/geo");

// ทุกฟิลด์ของวิทยาเขตเปิดเผยได้ (ไม่มีข้อมูลลับ) — แอปผู้โดยสารใช้คิดราคา โชว์ชื่อ/โลโก้ และเบอร์ฉุกเฉิน
const PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  displayName: true,
  logoUrl: true,
  brandColor: true,
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
  if (!area) throw ApiError.notFound("ไม่พบวิทยาเขตที่ให้บริการนี้");
  return area;
}

// วิทยาเขตที่ใกล้ที่สุดที่ครอบคลุมจุดนี้ (null = อยู่นอกทุกวิทยาเขต)
async function findForPoint(point) {
  const areas = await prisma.area.findMany({ where: { isActive: true } });
  return (
    areas
      .filter((a) => isWithinService(a, point))
      .sort((a, b) => distanceKm(areaCenter(a), point) - distanceKm(areaCenter(b), point))[0] ?? null
  );
}

// วิทยาเขตที่จะให้บริการทริปนี้ — ผู้โดยสารเลือกวิทยาเขตเองได้ (preferredAreaId) แต่จุดรับต้องอยู่ในระยะที่วินวิทยาเขตนั้นไปรับได้
async function resolveForPickup(pickup, preferredAreaId) {
  if (preferredAreaId) {
    const preferred = await prisma.area.findFirst({ where: { id: preferredAreaId, isActive: true } });
    if (preferred && isWithinService(preferred, pickup)) return preferred;
  }
  const area = await findForPoint(pickup);
  if (!area) {
    throw ApiError.unprocessable("จุดรับอยู่นอกวิทยาเขตที่ให้บริการ กรุณาเลือกจุดรับใหม่", "OUT_OF_SERVICE_AREA");
  }
  return area;
}

// ---------------------------------------------------------------------------
// admin: จัดการวิทยาเขต
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

// สีแบรนด์ของวิทยาเขตเป็นพื้นหลังของปุ่มและแถบหัวที่ใช้ตัวอักษรขาว — ต้องเข้มพอให้อ่านตัวขาวได้ (WCAG AA 4.5:1)
const HEX_RE = /^#[0-9a-f]{6}$/;
const MIN_WHITE_CONTRAST = 4.5;

function contrastWithWhite(hex) {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(Number.parseInt(hex.slice(i, i + 2), 16) / 255));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (luminance + 0.05);
}

function brandColor(value) {
  const hex = text(value, "สีแบรนด์", { max: 7 }).toLowerCase();
  if (!HEX_RE.test(hex)) throw ApiError.badRequest("สีแบรนด์ต้องเป็นรหัสสีแบบ #rrggbb เช่น #006664");
  if (contrastWithWhite(hex) < MIN_WHITE_CONTRAST) {
    throw ApiError.badRequest("สีแบรนด์อ่อนเกินไป ตัวอักษรสีขาวบนสีนี้จะอ่านไม่ออก กรุณาเลือกสีที่เข้มขึ้น");
  }
  return hex;
}

function cleanArea(body, { partial }) {
  const out = {};
  const has = (k) => !partial || body[k] !== undefined;

  if (has("slug")) {
    const slug = text(body.slug, "รหัสวิทยาเขต (slug)", { max: 40 })?.toLowerCase();
    if (!SLUG_RE.test(slug)) throw ApiError.badRequest("รหัสวิทยาเขตใช้ได้เฉพาะ a-z, 0-9 และขีด - เช่น ku-kps");
    out.slug = slug;
  }
  if (has("name")) out.name = text(body.name, "ชื่อวิทยาเขต");
  if (has("displayName")) out.displayName = text(body.displayName, "ชื่อที่แสดงในแอป", { max: 40 });
  if (body.logoUrl !== undefined) out.logoUrl = text(body.logoUrl, "โลโก้", { required: false, max: 500 });
  if (body.brandColor !== undefined) out.brandColor = brandColor(body.brandColor);

  if (has("centerLat") || has("centerLng")) {
    out.centerLat = num(body.centerLat, "ละติจูดจุดกลาง", { min: LAT_RANGE[0], max: LAT_RANGE[1] });
    out.centerLng = num(body.centerLng, "ลองจิจูดจุดกลาง", { min: LNG_RANGE[0], max: LNG_RANGE[1] });
  }
  // ฟิลด์ที่มีค่าเริ่มต้นใน DB (รัศมี/ค่าโดยสาร) ไม่บังคับตอนสร้าง — ตรวจเฉพาะเมื่อส่งมา
  const given = (k) => body[k] !== undefined && body[k] !== "";
  if (given("flatRadiusKm")) out.flatRadiusKm = num(body.flatRadiusKm, "รัศมีเขตเหมาจ่าย", { min: 0.1, max: 50 });
  if (given("serviceRadiusKm")) out.serviceRadiusKm = num(body.serviceRadiusKm, "รัศมีวิทยาเขตที่ให้บริการ", { min: 0.1, max: 100 });
  if (given("flatFare")) out.flatFare = num(body.flatFare, "ค่าโดยสารเหมาจ่าย", { max: 10000 });
  if (given("ratePerKm")) out.ratePerKm = num(body.ratePerKm, "ค่าโดยสารต่อกิโลเมตร", { max: 1000 });
  if (given("minFare")) out.minFare = num(body.minFare, "ค่าโดยสารขั้นต่ำ", { max: 10000 });
  if (body.emergencyContacts !== undefined) out.emergencyContacts = cleanContacts(body.emergencyContacts);
  if (body.isActive !== undefined) out.isActive = Boolean(body.isActive);
  return out;
}

function assertRadii(area) {
  if (area.serviceRadiusKm < area.flatRadiusKm) {
    throw ApiError.badRequest("รัศมีวิทยาเขตที่ให้บริการต้องไม่น้อยกว่ารัศมีเขตเหมาจ่าย");
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
  if (!scope.isSuper && id !== scope.areaId) throw ApiError.notFound("ไม่พบวิทยาเขตนี้");
  const area = await prisma.area.findUnique({ where: { id } });
  if (!area) throw ApiError.notFound("ไม่พบวิทยาเขตนี้");
  return area;
}

async function createArea(body) {
  const data = cleanArea(body, { partial: false });
  assertRadii({ flatRadiusKm: 2, serviceRadiusKm: 15, ...data });
  try {
    return await prisma.area.create({ data: { emergencyContacts: [], ...data } });
  } catch (err) {
    if (err?.code === "P2002") throw ApiError.conflict("รหัสวิทยาเขตนี้ถูกใช้แล้ว");
    throw err;
  }
}

// แอดมินวิทยาเขตแก้ค่าของวิทยาเขตตัวเองได้ (ค่าโดยสาร เบอร์ฉุกเฉิน ชื่อ โลโก้ ขอบเขต) แต่เปิด/ปิดวิทยาเขตและเปลี่ยนรหัสได้เฉพาะ super
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
    if (err?.code === "P2002") throw ApiError.conflict("รหัสวิทยาเขตนี้ถูกใช้แล้ว");
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
