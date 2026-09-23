import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    // ปุ่ม "เข้าสู่ระบบด่วน" (บัญชีเดโม + รหัสผ่าน) — ต้องเป็นค่าคงที่ตอน build เท่านั้น bundler ถึงตัดโค้ดทั้งก้อนทิ้งได้
    // (ถ้าเช็ค import.meta.env.VITE_DEMO_LOGIN ตรง ๆ แล้วไม่ได้ตั้งค่า Vite จะไม่แทนเป็นค่าคงที่ → รหัสผ่านเดโมหลุดไปอยู่ใน
    // bundle ของ production ให้ใครก็เปิดอ่านได้) — เปิดตอนรัน dev server หรือ build APK ทดสอบ (scripts/android-dev.mjs)
    __DEMO_LOGIN__: JSON.stringify(mode === "development" || process.env.VITE_DEMO_LOGIN === "1"),
  },
  server: {
    port: 5173,
    host: true, // bind ทุก network interface ไม่ใช่แค่ localhost — ให้เครื่องอื่นในวง LAN เดียวกันเข้าถึงได้
  },
}));
