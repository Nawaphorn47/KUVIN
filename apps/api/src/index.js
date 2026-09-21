require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const routes = require("./routes");
const registerSockets = require("./sockets");
const upload = require("./middlewares/upload");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const { sweepExpiredOffers } = require("./services/serviceRequest.service");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(upload.UPLOAD_DIR)); // เสิร์ฟไฟล์ที่อัปโหลดผ่าน POST /api/uploads

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
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
