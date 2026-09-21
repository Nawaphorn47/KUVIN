const prisma = require("../config/prisma");
const { verifyToken } = require("../utils/jwt");

// Socket room conventions:
// - "drivers:available"        — คนขับที่ออนไลน์ทุกคน รับ event "service-request:new"
// - "service-request:<id>"     — ผู้ใช้และคนขับของคำขอนั้นๆ รับ event "service-request:status"
// - "user:<id>" / "driver:<id>" — ใช้โดย notification.service สำหรับ "notification:new"
// - "admin"                     — admin ทุกคนที่ login แล้ว รับ event "sos:new" (เข้า room อัตโนมัติตอน connect)
//
// ทุก socket ต้องส่ง JWT ตอน connect ผ่าน `io(url, { auth: { token } })`
// (token เดียวกับที่ใช้ใน Authorization header ของ REST API) — ห้ามให้ client
// ระบุ driverId/userId เอง เพราะจะปลอมตัวเป็นคนอื่นและดักฟัง notification/location ได้

function authMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("unauthorized"));

  try {
    socket.auth = verifyToken(token); // { id, role }
    next();
  } catch {
    next(new Error("unauthorized"));
  }
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

    socket.on("driver:location", async ({ requestId, lat, lng }) => {
      if (role !== "driver" || !requestId) return;
      const request = await prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: { driverId: true },
      });
      if (!request || request.driverId !== authId) return;

      io.to(`service-request:${requestId}`).emit("driver:location", { lat, lng });
    });

    socket.on("disconnect", () => {
      // socket.io ออกจากทุก room ให้อัตโนมัติอยู่แล้วตอน disconnect
    });
  });
}

module.exports = registerSockets;
