const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { areaWhere, assertInScope } = require("../middlewares/adminScope");
const { findForPoint } = require("./area.service");

// room ของแอดมินที่ต้องเห็นเหตุในพื้นที่นี้ (ดู sockets/index.js) — super เห็นทุกพื้นที่เสมอ
const adminRooms = (areaId) => (areaId ? ["admin:super", `admin:area:${areaId}`] : ["admin:super"]);

// พื้นที่ของเหตุ: ทริปที่กำลังวิ่ง > พื้นที่ที่คนขับสังกัด > พื้นที่ที่ครอบคลุมพิกัด
async function resolveAlertArea(actorType, actorId, { serviceRequestId, lat, lng }) {
  if (serviceRequestId) {
    const request = await prisma.serviceRequest.findUnique({ where: { id: serviceRequestId }, select: { areaId: true } });
    if (request) return request.areaId;
  }
  if (actorType === "DRIVER") {
    const driver = await prisma.driver.findUnique({ where: { id: actorId }, select: { areaId: true } });
    if (driver) return driver.areaId;
  }
  if (typeof lat === "number" && typeof lng === "number") {
    return (await findForPoint({ lat, lng }))?.id ?? null;
  }
  return null;
}

async function getActorProfile(actorType, actorId) {
  if (actorType === "USER") {
    return prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true, phone: true } });
  }
  return prisma.driver.findUnique({ where: { id: actorId }, select: { fullName: true, phone: true } });
}

async function withActorInfo(alert) {
  const profile = await getActorProfile(alert.actorType, alert.actorId);
  return { ...alert, actorName: profile?.fullName ?? null, actorPhone: profile?.phone ?? null };
}

const VALID_EMERGENCY_NUMBERS = ["1669", "191"]; // 1669 = หน่วยแพทย์ฉุกเฉิน, 191 = ตำรวจ

// สร้างการแจ้งเหตุฉุกเฉิน — เฉพาะ user/driver ที่ login แล้วเท่านั้น แจ้งไปยัง admin dashboard แบบ real-time ทันที
// contactedEmergencyNumber (ไม่บังคับ): แอปไม่ได้โทรออกให้อัตโนมัติ (ทำไม่ได้ในเว็บแอป/เพื่อความปลอดภัย) แค่บันทึกไว้
// ว่าผู้แจ้งกดปุ่มโทร 1669/191 เองจากหน้า SOS ไปแล้วหรือยัง เพื่อให้ admin เห็นว่ามีการประสานงานหน่วยงานภายนอกหรือยัง
async function createAlert(actor, { lat, lng, note, serviceRequestId, contactedEmergencyNumber }, io) {
  const actorType = actor.role === "user" ? "USER" : actor.role === "driver" ? "DRIVER" : null;
  if (!actorType) throw ApiError.forbidden("เฉพาะผู้ใช้หรือคนขับเท่านั้นที่แจ้งเหตุฉุกเฉินได้");
  if (contactedEmergencyNumber && !VALID_EMERGENCY_NUMBERS.includes(contactedEmergencyNumber)) {
    throw ApiError.badRequest("contactedEmergencyNumber ต้องเป็น 1669 หรือ 191");
  }

  const areaId = await resolveAlertArea(actorType, actor.id, { serviceRequestId, lat, lng });

  const alert = await prisma.sosAlert.create({
    data: {
      actorType,
      actorId: actor.id,
      areaId,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      note: note || null,
      serviceRequestId: serviceRequestId || null,
      contactedEmergencyNumber: contactedEmergencyNumber || null,
    },
  });

  const payload = await withActorInfo(alert);
  io?.to(adminRooms(areaId)).emit("sos:new", payload);

  return payload;
}

// ผู้แจ้งกดปุ่มโทร 1669/191 จากหน้า SOS *หลังจาก* สร้าง alert ไปแล้ว (เคสปกติ: กด SOS ก่อน แล้วค่อยตัดสินใจ
// โทรตามหลัง) — อัปเดต alert เดิมแทนที่จะสร้างรายการซ้ำ ใครก็ได้ที่เป็นเจ้าของ alert เรียกได้ ไม่ต้องรอ admin
async function markContacted(id, actor, contactedEmergencyNumber) {
  if (!VALID_EMERGENCY_NUMBERS.includes(contactedEmergencyNumber)) {
    throw ApiError.badRequest("contactedEmergencyNumber ต้องเป็น 1669 หรือ 191");
  }

  const alert = await prisma.sosAlert.findUnique({ where: { id } });
  if (!alert) throw ApiError.notFound("ไม่พบรายการแจ้งเหตุนี้");
  if (alert.actorId !== actor.id) throw ApiError.forbidden("ไม่มีสิทธิ์แก้ไขรายการแจ้งเหตุนี้");

  const updated = await prisma.sosAlert.update({ where: { id }, data: { contactedEmergencyNumber } });
  return withActorInfo(updated);
}

// ผู้แจ้งยกเลิก alert ของตัวเองได้ตราบใดที่ยังไม่ถูก admin ปิดเคส (กดผิด/แจ้งเหตุพลาด) — ต่างจาก
// resolveAlert ด้านล่างที่สงวนไว้ให้ admin เท่านั้น (ผ่าน role admin middleware บน route)
async function cancelOwnAlert(id, actor) {
  const alert = await prisma.sosAlert.findUnique({ where: { id } });
  if (!alert) throw ApiError.notFound("ไม่พบรายการแจ้งเหตุนี้");
  if (alert.actorId !== actor.id) throw ApiError.forbidden("ไม่มีสิทธิ์ยกเลิกรายการแจ้งเหตุนี้");
  if (alert.status === "RESOLVED") throw ApiError.conflict("รายการนี้ถูกจัดการไปแล้ว");

  const updated = await prisma.sosAlert.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date(), resolvedNote: "ผู้แจ้งยกเลิกเอง (แจ้งเหตุผิดพลาด)" },
  });
  return withActorInfo(updated);
}

async function listAlerts(scope, { status } = {}) {
  const alerts = await prisma.sosAlert.findMany({
    where: { ...areaWhere(scope), ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return Promise.all(alerts.map(withActorInfo));
}

async function resolveAlert(scope, id, resolvedNote) {
  const alert = await prisma.sosAlert.findUnique({ where: { id } });
  if (!alert) throw ApiError.notFound("ไม่พบรายการแจ้งเหตุนี้");
  assertInScope(scope, alert.areaId, "ไม่พบรายการแจ้งเหตุนี้");
  if (alert.status === "RESOLVED") throw ApiError.conflict("รายการนี้ถูกจัดการไปแล้ว");

  const updated = await prisma.sosAlert.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date(), resolvedNote: resolvedNote || null },
  });

  return withActorInfo(updated);
}

module.exports = { createAlert, markContacted, cancelOwnAlert, listAlerts, resolveAlert };
