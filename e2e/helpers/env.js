const fs = require("fs");
const path = require("path");

// อ่านค่าจาก .env ที่ root ของ repo (เฉพาะเครื่อง dev — ไม่ได้ commit) เพื่อใช้บัญชีแอดมินของ stack ในเครื่อง
function readDotEnv() {
  try {
    const text = fs.readFileSync(path.join(__dirname, "..", "..", ".env"), "utf8");
    return Object.fromEntries(
      text
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
    );
  } catch {
    return {};
  }
}

const dot = readDotEnv();

const API_URL = (process.env.API_URL || "http://localhost:3301").replace(/\/$/, "");
const WEB_URL = (process.env.WEB_URL || "http://localhost:3302").replace(/\/$/, "");
const ADMIN_URL = (process.env.ADMIN_URL || "http://localhost:3303").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || dot.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || dot.SEED_ADMIN_PASSWORD || "";

// กันเผลอยิงเทสต์ใส่ระบบจริง
if (/kuvinn\.tech/i.test(`${API_URL} ${WEB_URL} ${ADMIN_URL}`) && process.env.E2E_ALLOW_PRODUCTION !== "yes-i-know") {
  throw new Error("e2e สร้างข้อมูลทดสอบลงฐานข้อมูล — ห้ามชี้ไปที่ kuvinn.tech (ใช้ stack ในเครื่องหรือ staging)");
}

module.exports = { API_URL, WEB_URL, ADMIN_URL, ADMIN_EMAIL, ADMIN_PASSWORD };
