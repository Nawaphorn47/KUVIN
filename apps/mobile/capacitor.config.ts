import type { CapacitorConfig } from "@capacitor/cli";

// ค่านี้ถูกอ่านตอน `npx cap sync` แล้วฝังลงในโปรเจกต์ Android — ไม่ใช่ตอนแอปรัน
// CAP_ALLOW_HTTP=1 (ตั้งให้อัตโนมัติโดย scripts/android-dev.mjs) ใช้ตอนทดสอบบนมือถือจริงที่ยิง API ไปหาเครื่อง dev
// ผ่าน Wi-Fi แบบ http:// ธรรมดา — ปกติ Android บล็อกทั้ง cleartext และ mixed content (หน้าแอปเป็น https://localhost)
// build ที่จะแจกจริงต้องชี้ไป API ที่เป็น https เท่านั้น จึงไม่เปิดสองอย่างนี้
const allowHttp = process.env.CAP_ALLOW_HTTP === "1";

const config: CapacitorConfig = {
  appId: "com.kuvin.app", // ต้องตรงกับ package name ที่ลงทะเบียนใน Firebase และเปลี่ยนไม่ได้หลังขึ้น Play Store
  appName: "KU VIN",
  webDir: "dist",
  server: allowHttp ? { cleartext: true } : undefined,
  android: {
    allowMixedContent: allowHttp,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
