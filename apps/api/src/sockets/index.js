const prisma = require("../config/prisma");
const { verifyToken } = require("../utils/jwt");
const { assertNotSuspended } = require("../utils/accountStatus");

// Socket room conventions:
// - "drivers:available"        — คนขับที่ออนไลน์ทุกคน รับ event "service-request:new"
// - "service-request:<id>"     — ผู้ใช้และคนขับของคำขอนั้นๆ รับ event "service-request:status"
// - "user:<id>" / "driver:<id>" — ใช้โดย notification.service สำหรับ "notification:new"
// - "admin"                     — admin ทุกคนที่ login แล้ว รับ event "sos:new" (เข้า room อัตโนมัติตอน connect)
//
// ทุก socket ต้องส่ง JWT ตอน connect ผ่าน `io(url, { auth: { token } })`
// (token เดียวกับที่ใช้ใน Authorization header ของ REST API) — ห้ามให้ client
// ระบุ driverId/userId เอง เพราะจะปลอมตัวเป็นคนอื่นและดักฟัง notification/location ได้

const LOCATION_PERSIST_MS = 10 * 1000;
const lastLocationWrite = new Map(); // driverId -> เวลาที่เขียน currentLat/Lng ล่าสุด

async function authMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("unauthorized"));

  try {
    socket.auth = verifyToken(token); // { id, role }
  } catch {
    return next(new Error("unauthorized"));
  }

  try {
    await assertNotSuspended(socket.auth.role, socket.auth.id);
  } catch {
    return next(new Error("suspended"));
  }
  next();
}

function registerSockets(io) {
  io.use(authMiddleware);

  io.on("connection", (socket) => {
    const { id: authId, role } = socket.auth;

    if (role === "admin") socket.join("admin");

    socket.on("driver:online", () => {
      if (role !== "driver") return;
      socket.join("drivers:available");
      socket.join(`driver:${authId}`);
    });

    socket.on("driver:offline", () => {
      if (role !== "driver") return;
      socket.leave("drivers:available");
    });

    socket.on("user:join", () => {
      if (role !== "user") return;
      socket.join(`user:${authId}`);
    });

    socket.on("service-request:watch", async (requestId) => {
      if (!requestId) return;
      const request = await prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: { userId: true, driverId: true },
      });
      if (!request) return;

      const isParticipant =
        (role === "user" && request.userId === authId) ||
        (role === "driver" && request.driverId === authId) ||
        role === "admin";
      if (!isParticipant) return;

      socket.join(`service-request:${requestId}`);
    });

    // คนขับส่งตำแหน่งสดระหว่างทริป → ส่งต่อให้ทุกคนใน room ของคำขอนั้น (ผู้โดยสารเห็นหมุดคนขับเคลื่อนที่)
    // และบันทึกตำแหน่งล่าสุดลง DB (ไม่ถี่เกิน LOCATION_PERSIST_MS) ไว้ให้ผู้โดยสารที่เพิ่งเข้าหน้ามีตำแหน่งตั้งต้น
    socket.on("driver:location", async ({ requestId, lat, lng } = {}) => {
      if (role !== "driver" || !requestId) return;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

      const request = await prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: { driverId: true, status: true },
      });
      if (!request || request.driverId !== authId) return;
      if (!["ACCEPTED", "IN_PROGRESS"].includes(request.status)) return;

      io.to(`service-request:${requestId}`).emit("driver:location", { lat, lng });

      const now = Date.now();
      if (now - (lastLocationWrite.get(authId) ?? 0) >= LOCATION_PERSIST_MS) {
        lastLocationWrite.set(authId, now);
        prisma.driver.update({ where: { id: authId }, data: { currentLat: lat, currentLng: lng } }).catch(() => {});
      }
    });

    socket.on("disconnect", () => {
      // socket.io ออกจากทุก room ให้อัตโนมัติอยู่แล้วตอน disconnect
    });
  });
}

module.exports = registerSockets;
