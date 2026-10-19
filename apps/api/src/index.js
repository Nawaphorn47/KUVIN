require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const routes = require("./routes");
const registerSockets = require("./sockets");
const { corsOrigin } = require("./config/cors");
const upload = require("./middlewares/upload");
const prisma = require("./config/prisma");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const { sweepExpiredOffers } = require("./services/serviceRequest.service");

const app = express();

// บน Railway/Render/Fly ทุก request ผ่าน reverse proxy ที่ทำ HTTPS ให้ (1 ชั้น) — ถ้าไม่ trust proxy:
//  - req.protocol เป็น "http" → url รูปที่อัปโหลดเป็น http:// แล้วแอปที่เปิดผ่าน https บล็อกทิ้ง (mixed content)
//  - rate limit เห็นทุกคนเป็น IP เดียวกัน (IP ของ proxy) → login รวมทั้งระบบได้แค่ 20 ครั้ง/15 นาที
// ตั้ง TRUST_PROXY เองได้ถ้ามี proxy มากกว่า 1 ชั้น; ตอน dev ไม่มี proxy จึงปิดไว้ (กันปลอม X-Forwarded-For)
const trustProxy = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === "production" ? "1" : "");
if (trustProxy) app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

app.disable("x-powered-by");
// security headers พื้นฐาน: ห้ามเบราว์เซอร์เดาชนิดไฟล์, ห้ามถูกฝังใน iframe (กัน clickjacking), ไม่ส่ง URL ต่อให้เว็บอื่น
app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" });
  if (req.secure) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(cors({ origin: corsOrigin })); // อนุญาตเฉพาะเว็บของเรา — ดู config/cors.js
app.use(express.json({ limit: "100kb" })); // JSON ของแอปเล็กมาก — กันส่ง body ยักษ์มาถ่วง server
// เสิร์ฟไฟล์ที่อัปโหลดผ่าน POST /api/uploads — dotfiles: "deny" กันเปิดไฟล์ส่วนตัวใน uploads/.private
app.use("/uploads", express.static(upload.UPLOAD_DIR, { dotfiles: "deny" }));
// ให้ platform/Docker เช็คว่า server พร้อมรับ request — ตรวจการเชื่อมต่อ DB จริง: ปกติ 200, DB ล่ม 503 (แอปไม่ crash
// กลับมา 200 เองเมื่อ DB กลับมา) ใช้ทั้ง /health (Railway) และ /api/health (CI, deploy)
async function health(req, res) {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("db timeout")), 3000)),
    ]);
    res.json({ ok: true, db: "up" });
  } catch {
    res.status(503).json({ ok: false, db: "down" });
  }
}
app.get("/health", health);
app.get("/api/health", health);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: corsOrigin } });
app.set("io", io); // controllers ดึงผ่าน req.app.get("io") เพื่อ emit event แบบ real-time
registerSockets(io);

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`KU VIN API listening on port ${PORT}`);
});

// ตรวจข้อเสนองานที่หมดเวลา (15 วิ/คน) แล้วส่งต่อให้คิวถัดไป — เช็คทุก 1 วิเพื่อให้ผู้โดยสารไม่ต้องรอเกินหน้าต่างตอบรับ
// (transaction ใน handleDriverResponse ปลอดภัยต่อการทำงานซ้อนกันอยู่แล้ว แต่กันรอบเก่ายังไม่จบไว้ไม่ให้สะสม)
let sweeping = false;
setInterval(async () => {
  if (sweeping) return;
  sweeping = true;
  try {
    await sweepExpiredOffers(io);
  } catch (err) {
    console.error("sweepExpiredOffers failed:", err);
  } finally {
    sweeping = false;
  }
}, 1000);
