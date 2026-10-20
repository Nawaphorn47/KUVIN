const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const fs = require("node:fs");
const path = require("node:path");
const { sanitizeUser } = require("./auth.service");
const { AVATAR_DIR } = require("../middlewares/avatarUpload");

async function updateFcmToken(userId, fcmToken) {
  const user = await prisma.user.update({ where: { id: userId }, data: { fcmToken: fcmToken || null } });
  return sanitizeUser(user);
}

// แก้ไขข้อมูลส่วนตัว — เฉพาะ fullName/phone/studentId เท่านั้น (email เป็น identifier สำหรับ login
// ห้ามแก้ตรงนี้ เปลี่ยนรหัสผ่านให้ใช้ flow forgot/reset-password แยกต่างหาก)
async function updateProfile(userId, { fullName, phone, studentId }) {
  if (phone !== undefined && !/^0\d{9}$/.test(phone)) {
    throw ApiError.badRequest("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0");
  }

  const current = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  const phoneChanged = phone !== undefined && phone !== current?.phone;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName !== undefined && { fullName }),
        // เปลี่ยนเบอร์ = ต้องยืนยัน OTP ใหม่ (เบอร์ใหม่ยังไม่ได้พิสูจน์ว่าเป็นของเจ้าของบัญชี)
        ...(phoneChanged && { phone, phoneVerifiedAt: null }),
        ...(studentId !== undefined && { studentId }),
      },
    });
    return sanitizeUser(user);
  } catch (err) {
    if (err?.code === "P2002") throw ApiError.conflict("เบอร์นี้มีบัญชีอื่นใช้อยู่แล้ว");
    throw err;
  }
}

// รูปโปรไฟล์: บัญชีเดียวใช้รูปเดียวทั้งโหมดผู้โดยสารและคนขับ — โหมดคนขับ (token คนขับ) หาบัญชีผู้ใช้จาก driver.userId
async function ownerUserId(auth) {
  if (auth.role === "user") return auth.id;
  const driver = await prisma.driver.findUnique({ where: { id: auth.id }, select: { userId: true } });
  if (!driver?.userId) throw ApiError.badRequest("บัญชีคนขับแบบเก่ายังตั้งรูปโปรไฟล์ไม่ได้ กรุณาสมัครผ่านบัญชีผู้ใช้");
  return driver.userId;
}

function removeAvatarFile(name) {
  if (name) fs.promises.unlink(path.join(AVATAR_DIR, path.basename(name))).catch(() => {});
}

async function saveAvatar(auth, file) {
  if (!file) throw ApiError.badRequest("ไม่พบไฟล์รูป (field name ต้องเป็น file)");
  let userId;
  try {
    userId = await ownerUserId(auth);
  } catch (err) {
    removeAvatarFile(file.filename);
    throw err;
  }
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { avatarFile: true } });
  const user = await prisma.user.update({ where: { id: userId }, data: { avatarFile: file.filename } });
  removeAvatarFile(before?.avatarFile);
  return sanitizeUser(user);
}

async function removeAvatar(auth) {
  const userId = await ownerUserId(auth);
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { avatarFile: true } });
  const user = await prisma.user.update({ where: { id: userId }, data: { avatarFile: null } });
  removeAvatarFile(before?.avatarFile);
  return sanitizeUser(user);
}

module.exports = { updateFcmToken, updateProfile, saveAvatar, removeAvatar };
