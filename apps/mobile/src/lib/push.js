import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { api } from "./api";
import { getToken } from "./auth";

// เปิดเฉพาะในแอป native ที่ build พร้อม google-services.json แล้วเท่านั้น (scripts/android-dev.mjs ตั้ง
// VITE_PUSH_ENABLED ให้เองถ้าเจอไฟล์) — บน Android ถ้าเรียก register() ตอนที่ Firebase ยังไม่ถูกตั้งค่า แอป crash
// ทั้งแอปจากฝั่ง native ไม่ใช่แค่ error ใน JS ที่ catch ได้; บนเว็บปกติ (เปิดผ่าน browser) ไม่มีผลอะไร
const ENABLED = Capacitor.isNativePlatform() && import.meta.env.VITE_PUSH_ENABLED === "1";

const ENDPOINT = { user: "/users/me/fcm-token", driver: "/drivers/me/fcm-token" };

// ต้องตรงกับ android.notification.channelId ใน apps/api/src/services/fcm.service.js — channel ความสำคัญสูง
// ให้แจ้งเตือนเด้งบนจอ (heads-up) พร้อมเสียง เพราะงานใหม่ของคนขับมีเวลาตอบรับจำกัด
const CHANNEL_ID = "kuvin_alerts";

let currentRole = null;
let setupPromise = null;

function setupOnce() {
  setupPromise ??= (async () => {
    // registration ยิงทุกครั้งที่เรียก register() (ไม่ใช่แค่ครั้งแรก) — ส่ง token ขึ้น server ทุกครั้งเพราะ token
    // เปลี่ยนได้เอง (ติดตั้งแอปใหม่/ล้างข้อมูล) และบัญชีเดียวเก็บได้แค่เครื่องเดียว (เครื่องล่าสุดที่ login)
    await PushNotifications.addListener("registration", ({ value }) => {
      if (!currentRole || !getToken()) return;
      api.patch(ENDPOINT[currentRole], { fcmToken: value }).catch(() => {});
    });
    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registration failed:", err?.error ?? err);
    });
    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: "งานและสถานะทริป",
      description: "งานใหม่ คนขับรับงาน การชำระเงิน และสถานะทริป",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  })();
  return setupPromise;
}

// เรียกทุกครั้งที่รู้ role ของ session แล้ว (AppContext.refreshMe) — ขออนุญาตแจ้งเตือนครั้งแรก แล้วลงทะเบียน
// device token ผูกกับบัญชีที่ login อยู่
export async function registerPush(role) {
  if (!ENABLED || !ENDPOINT[role]) return;
  currentRole = role;
  try {
    await setupOnce();
    let { receive } = await PushNotifications.checkPermissions();
    if (receive === "prompt" || receive === "prompt-with-rationale") {
      ({ receive } = await PushNotifications.requestPermissions());
    }
    if (receive !== "granted") return;
    await PushNotifications.register();
  } catch (err) {
    console.warn("[push] register failed:", err);
  }
}

// เรียกก่อน clearToken() ตอนออกจากระบบ/สลับบัญชี — ล้าง token ฝั่ง server ไม่งั้นเครื่องนี้ยังได้แจ้งเตือนของบัญชีเดิม
// ต่อไปเรื่อย ๆ (เช่น สลับจากผู้โดยสารเป็นคนขับบนเครื่องเดียวกัน แล้วยังเด้งแจ้งเตือนของผู้โดยสาร)
// แนบ token เองเพราะ request interceptor ของ axios รันแบบ async — ถึงตอนนั้น clearToken() ลบ token ไปแล้ว
export function unregisterPush() {
  const role = currentRole;
  currentRole = null;
  const token = getToken();
  if (!ENABLED || !role || !token) return;
  api.patch(ENDPOINT[role], { fcmToken: null }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}
