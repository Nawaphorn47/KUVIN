const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sanitizeUser } = require("./auth.service");

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

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(phone !== undefined && { phone }),
      ...(studentId !== undefined && { studentId }),
    },
  });
  return sanitizeUser(user);
}

module.exports = { updateFcmToken, updateProfile };
