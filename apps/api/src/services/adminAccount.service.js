// super admin จัดการบัญชีแอดมิน: สร้างแอดมินให้แต่ละพื้นที่ (เช่น ขายแฟรนไชส์ให้วินที่อื่น) เปลี่ยนพื้นที่/บทบาท รีเซ็ตรหัส
const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const SALT_ROUNDS = 10;
const ROLES = ["SUPER_ADMIN", "AREA_ADMIN"];

const SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  areaId: true,
  createdAt: true,
  area: { select: { id: true, displayName: true } },
};

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < 12) {
    throw ApiError.badRequest("รหัสผ่านแอดมินต้องมีอย่างน้อย 12 ตัวอักษร");
  }
}

// AREA_ADMIN ต้องผูกพื้นที่ที่มีอยู่จริง, SUPER_ADMIN ไม่ผูกพื้นที่
async function resolveRoleArea(role, areaId) {
  if (!ROLES.includes(role)) throw ApiError.badRequest("บทบาทต้องเป็น SUPER_ADMIN หรือ AREA_ADMIN");
  if (role === "SUPER_ADMIN") return { role, areaId: null };
  if (!areaId) throw ApiError.badRequest("แอดมินพื้นที่ต้องเลือกพื้นที่ที่ดูแล");
  const area = await prisma.area.findUnique({ where: { id: areaId }, select: { id: true } });
  if (!area) throw ApiError.badRequest("ไม่พบพื้นที่ที่เลือก");
  return { role, areaId };
}

async function listAdmins() {
  return prisma.admin.findMany({ select: SELECT, orderBy: [{ role: "desc" }, { createdAt: "asc" }] });
}

async function createAdmin({ fullName, email, password, role = "AREA_ADMIN", areaId }) {
  const name = typeof fullName === "string" ? fullName.trim() : "";
  if (!name) throw ApiError.badRequest("ต้องระบุชื่อแอดมิน");
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw ApiError.badRequest("รูปแบบอีเมลไม่ถูกต้อง");
  assertPassword(password);
  const roleArea = await resolveRoleArea(role, areaId);

  try {
    return await prisma.admin.create({
      data: { fullName: name, email: normalized, passwordHash: await bcrypt.hash(password, SALT_ROUNDS), ...roleArea },
      select: SELECT,
    });
  } catch (err) {
    if (err?.code === "P2002") throw ApiError.conflict("อีเมลนี้เป็นบัญชีแอดมินอยู่แล้ว");
    throw err;
  }
}

async function countSupers(excludeId) {
  return prisma.admin.count({ where: { role: "SUPER_ADMIN", id: { not: excludeId } } });
}

async function updateAdmin(actorId, id, { fullName, role, areaId, password }) {
  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("ไม่พบบัญชีแอดมินนี้");

  const data = {};
  if (fullName !== undefined) {
    const name = typeof fullName === "string" ? fullName.trim() : "";
    if (!name) throw ApiError.badRequest("ต้องระบุชื่อแอดมิน");
    data.fullName = name;
  }
  if (role !== undefined || areaId !== undefined) {
    const nextRole = role ?? existing.role;
    // ลดสิทธิ์ super คนสุดท้ายไม่ได้ ไม่งั้นจะไม่เหลือใครสร้างพื้นที่/แอดมินได้อีก
    if (existing.role === "SUPER_ADMIN" && nextRole !== "SUPER_ADMIN" && (await countSupers(id)) === 0) {
      throw ApiError.conflict("ต้องมี super admin อย่างน้อย 1 คนเสมอ");
    }
    if (id === actorId && nextRole !== "SUPER_ADMIN") throw ApiError.conflict("ลดสิทธิ์ของตัวเองไม่ได้");
    Object.assign(data, await resolveRoleArea(nextRole, areaId ?? existing.areaId));
  }
  if (password !== undefined) {
    assertPassword(password);
    data.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  return prisma.admin.update({ where: { id }, data, select: SELECT });
}

async function deleteAdmin(actorId, id) {
  if (id === actorId) throw ApiError.conflict("ลบบัญชีของตัวเองไม่ได้");
  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("ไม่พบบัญชีแอดมินนี้");
  if (existing.role === "SUPER_ADMIN" && (await countSupers(id)) === 0) {
    throw ApiError.conflict("ต้องมี super admin อย่างน้อย 1 คนเสมอ");
  }
  await prisma.admin.delete({ where: { id } });
}

module.exports = { listAdmins, createAdmin, updateAdmin, deleteAdmin };
