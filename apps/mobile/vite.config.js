import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // bind ทุก network interface ไม่ใช่แค่ localhost — ให้เครื่องอื่นในวง LAN เดียวกันเข้าถึงได้
  },
});
