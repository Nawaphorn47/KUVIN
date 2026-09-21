// ตรวจว่าบัญชีผู้ใช้/คนขับถูกระงับหรือไม่ — ใช้ทั้ง REST (middlewares/auth.js), socket และตอน login
// cache สั้น ๆ กันยิง DB ทุก request; admin ระงับ/ปลดระงับแล้วเรียก invalidate ทันที (process เดียวกัน)
const prisma = require("../config/prisma");
const ApiError = require("./ApiError");

const TTL_MS = 10 * 1000;
const cache = new Map(); // "role:id" -> { at, reason: string | null }  (null = ไม่ถูกระงับ)

function suspendedMessage(reason) {
  return `บัญชีของคุณถูกระงับการใช้งาน${reason ? `: ${reason}` : ""} กรุณาติดต่อผู้ดูแลระบบ`;
}

async function lookup(role, id) {
  const select = { isSuspended: true, suspendedReason: true };
  const row =
    role === "user"
      ? await prisma.user.findUnique({ where: { id }, select })
      : await prisma.driver.findUnique({ where: { id }, select });
  return row?.isSuspended ? (row.suspendedReason ?? "") : null;
}

// คืน undefined ถ้าปกติ, ไม่งั้น throw ApiError 403 (code ACCOUNT_SUSPENDED) — แอดมินไม่ถูกตรวจ
async function assertNotSuspended(role, id) {
  if (role !== "user" && role !== "driver") return;
  const key = `${role}:${id}`;
  let hit = cache.get(key);
  if (!hit || Date.now() - hit.at > TTL_MS) {
    hit = { at: Date.now(), reason: await lookup(role, id) };
    cache.set(key, hit);
  }
  if (hit.reason !== null) throw ApiError.forbidden(suspendedMessage(hit.reason), "ACCOUNT_SUSPENDED");
}

const invalidateAccountStatus = (role, id) => cache.delete(`${role}:${id}`);

module.exports = { assertNotSuspended, invalidateAccountStatus, suspendedMessage };
