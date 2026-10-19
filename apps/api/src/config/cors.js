// เว็บไหนเรียก API / Socket.IO ได้บ้าง (CORS) — ใช้ร่วมกันทั้ง Express และ Socket.IO
//
// CORS_ORIGINS = รายชื่อ origin คั่นด้วย comma เช่น https://app.kuvin.com,https://admin.kuvin.com
// ไม่ตั้ง:
//  - dev: อนุญาตทุก origin — ทดสอบจากมือถือในวง LAN ผ่าน http://<IP เครื่อง>:5173 ได้โดยไม่ต้องตั้งค่า
//  - production: ใช้โดเมนบน Railway ที่ใช้งานอยู่ตอนนี้ (กันเว็บจริงพังถ้า deploy ก่อนตั้งค่า) — ย้ายโดเมนแล้วต้องตั้ง CORS_ORIGINS
// แอป Android (Capacitor) เปิดหน้าเว็บจาก https://localhost จึงอนุญาตเสมอ
// request ที่ไม่มี header Origin (curl, server-to-server) ไม่ใช่เรื่องของ CORS — อนุญาตตามปกติ
const CAPACITOR_ORIGINS = ["https://localhost", "capacitor://localhost"];
const RAILWAY_ORIGINS = [
  "https://web-app-production-6f95.up.railway.app",
  "https://admin-production-2219.up.railway.app",
];

function parseOrigins(value) {
  return value
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function buildAllowList(env = process.env) {
  if (env.CORS_ORIGINS) return new Set([...parseOrigins(env.CORS_ORIGINS), ...CAPACITOR_ORIGINS]);
  if (env.NODE_ENV === "production") return new Set([...RAILWAY_ORIGINS, ...CAPACITOR_ORIGINS]);
  return null; // dev: ทุก origin
}

const allowList = buildAllowList();

function isAllowedOrigin(origin) {
  return !origin || allowList === null || allowList.has(origin);
}

// รูปแบบ callback ที่ทั้งแพ็กเกจ cors และ Socket.IO รับได้
function corsOrigin(origin, callback) {
  callback(null, isAllowedOrigin(origin));
}

module.exports = { corsOrigin, isAllowedOrigin, buildAllowList };
