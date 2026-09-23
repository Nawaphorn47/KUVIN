// Firebase Cloud Messaging — ใช้ firebase-admin SDK จริง
// ต้องมี credentials จาก Firebase project ก่อนถึงจะส่ง push จริงได้ (ดูวิธีตั้งค่าใน apps/api/README.md)
// ถ้ายังไม่มี credentials จะ fallback เป็นโหมด log-only โดยอัตโนมัติ ไม่ทำให้แอปพังหรือ crash

const admin = require("firebase-admin");

let app = null;
let initError = null;

function init() {
  if (app || initError) return app;

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // เหมาะกับ deploy platform ที่ mount ไฟล์ไม่ได้ (เช่น Railway/Render) — วาง JSON ทั้งก้อนใน env var
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(serviceAccount);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // ชี้ไปที่ไฟล์ service-account.json บนเครื่อง/เซิร์ฟเวอร์
      credential = admin.credential.applicationDefault();
    } else {
      return null; // ยังไม่ได้ตั้งค่า — ใช้โหมด stub
    }

    app = admin.initializeApp({ credential });
    console.log("[fcm] Firebase Admin initialized — push notifications are live");
    return app;
  } catch (err) {
    initError = err;
    console.error("[fcm] Failed to initialize Firebase Admin, falling back to stub:", err.message);
    return null;
  }
}

async function sendPush({ token, title, body }) {
  if (!token) return { sent: false, reason: "no device token" };

  const firebaseApp = init();
  if (!firebaseApp) {
    console.log(`[fcm:stub] would push to ${token.slice(0, 8)}...: "${title}" — ${body}`);
    return { sent: false, reason: "FCM not configured" };
  }

  try {
    const messageId = await admin.messaging().send({
      token,
      notification: { title, body },
      // high = ปลุกเครื่องที่อยู่ในโหมดประหยัดแบตให้ส่งถึงทันที (งานใหม่ของคนขับมีเวลาตอบรับจำกัด)
      // channelId ต้องตรงกับ apps/mobile/src/lib/push.js — ถ้าเครื่องยังไม่มี channel นี้ Android ใช้ channel สำรองแทน
      android: { priority: "high", notification: { channelId: "kuvin_alerts", sound: "default" } },
    });
    return { sent: true, messageId };
  } catch (err) {
    console.error("[fcm] send failed (non-fatal):", err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendPush };
