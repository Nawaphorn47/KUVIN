const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendPush } = require("./fcm.service");

async function notify(io, { recipientType, recipientId, title, body }) {
  const notification = await prisma.notification.create({
    data: { recipientType, recipientId, title, body },
  });

  io?.to(room(recipientType, recipientId)).emit("notification:new", notification);
  pushBestEffort({ recipientType, recipientId, title, body });

  return notification;
}

// ยิง FCM push แบบ fire-and-forget — พลาดแล้วไม่ควรทำให้ flow หลัก (สร้าง/อัปเดตคำขอ) ล้มไปด้วย
async function pushBestEffort({ recipientType, recipientId, title, body }) {
  try {
    const account =
      recipientType === "USER"
        ? await prisma.user.findUnique({ where: { id: recipientId }, select: { fcmToken: true } })
        : await prisma.driver.findUnique({ where: { id: recipientId }, select: { fcmToken: true } });

    if (account?.fcmToken) {
      await sendPush({ token: account.fcmToken, title, body });
    }
  } catch (err) {
    console.error("push notification failed (non-fatal):", err.message);
  }
}

async function listForRecipient({ recipientType, recipientId }) {
  return prisma.notification.findMany({
    where: { recipientType, recipientId },
    orderBy: { createdAt: "desc" },
  });
}

async function markRead(id, { recipientType, recipientId }) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw ApiError.notFound("Notification not found");
  if (notification.recipientType !== recipientType || notification.recipientId !== recipientId) {
    throw ApiError.forbidden("ไม่มีสิทธิ์เข้าถึงการแจ้งเตือนนี้");
  }
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

function room(recipientType, recipientId) {
  return `${recipientType.toLowerCase()}:${recipientId}`;
}

module.exports = { notify, listForRecipient, markRead, room };
