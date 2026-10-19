// แชตในทริประหว่างผู้โดยสารกับคนขับ — อ่านได้เฉพาะคู่กรณีของทริป ส่งได้เฉพาะตอนทริปยังดำเนินอยู่
// (คนขับรับงานแล้ว → ถึงปลายทาง) ข้อความเก็บไว้ในระบบเพื่อให้แอดมินตรวจย้อนหลังได้เมื่อมีเรื่องร้องเรียน/SOS
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendPush } = require("./fcm.service");

const BODY_MAX = 300;
const MESSAGES_PER_TRIP = 200; // กันสแปม/ยิงข้อความวนจนตาราง/แจ้งเตือนท่วม
const OPEN_STATUSES = ["ACCEPTED", "IN_PROGRESS"];

async function loadForParticipant(requestId, actor) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      userId: true,
      driverId: true,
      user: { select: { fullName: true, fcmToken: true } },
      driver: { select: { fullName: true, fcmToken: true } },
    },
  });
  if (!request) throw ApiError.notFound("ไม่พบคำขอนี้");
  const allowed =
    (actor.role === "user" && request.userId === actor.id) || (actor.role === "driver" && request.driverId === actor.id);
  if (!allowed) throw ApiError.forbidden("ไม่มีสิทธิ์เข้าถึงแชตของทริปนี้");
  return request;
}

// ดึงข้อความทั้งหมดของทริป และทำเครื่องหมายว่าอ่านแล้วสำหรับข้อความที่อีกฝั่งส่งมา
// markRead = false ใช้กับปุ่มแชตบนหน้าทริปที่แค่นับข้อความใหม่ (ยังไม่ได้เปิดอ่านจริง)
async function listMessages(requestId, actor, { markRead = true } = {}) {
  const request = await loadForParticipant(requestId, actor);
  if (markRead) await prisma.tripMessage.updateMany({
    where: { serviceRequestId: requestId, senderRole: { not: actor.role }, readAt: null },
    data: { readAt: new Date() },
  });
  const messages = await prisma.tripMessage.findMany({
    where: { serviceRequestId: requestId },
    orderBy: { createdAt: "asc" },
  });
  return { open: OPEN_STATUSES.includes(request.status), status: request.status, messages };
}

async function sendMessage(requestId, actor, { body }, io) {
  const request = await loadForParticipant(requestId, actor);
  if (!OPEN_STATUSES.includes(request.status)) {
    throw ApiError.conflict("แชตเปิดเฉพาะระหว่างที่ทริปกำลังดำเนินอยู่");
  }
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) throw ApiError.badRequest("พิมพ์ข้อความก่อนส่ง");
  if (text.length > BODY_MAX) throw ApiError.badRequest(`ข้อความยาวได้ไม่เกิน ${BODY_MAX} ตัวอักษร`);
  const count = await prisma.tripMessage.count({ where: { serviceRequestId: requestId } });
  if (count >= MESSAGES_PER_TRIP) throw ApiError.conflict("ส่งข้อความในทริปนี้ครบจำนวนแล้ว โทรหากันแทนได้");

  const message = await prisma.tripMessage.create({
    data: { serviceRequestId: requestId, senderRole: actor.role, body: text },
  });
  io?.to(`service-request:${requestId}`).emit("trip:message", message);

  // แจ้งเตือนอีกฝั่ง (ถ้าแอปอยู่เบื้องหลัง) — ไม่บันทึกลงรายการแจ้งเตือน กันรายการแจ้งเตือนรกด้วยข้อความแชต
  const sender = actor.role === "user" ? request.user : request.driver;
  const receiver = actor.role === "user" ? request.driver : request.user;
  sendPush({ token: receiver?.fcmToken, title: `ข้อความจาก ${sender?.fullName ?? "อีกฝั่ง"}`, body: text }).catch(() => {});
  return message;
}

module.exports = { listMessages, sendMessage, BODY_MAX };
