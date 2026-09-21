import { io } from "socket.io-client";
import { getToken } from "./auth";

// เหตุผลเดียวกับ lib/api.js — ใช้ hostname ของหน้าเว็บที่เปิดอยู่จริง ไม่ hardcode localhost
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || `http://${window.location.hostname}:4000`;

export const socket = io(SOCKET_URL, { autoConnect: false });

// เชื่อมต่อ socket พร้อมแนบ JWT (ต้องมี token ก่อนเสมอ ดู middlewares/auth.js ฝั่ง backend ที่บังคับ auth ตอน
// connect) — คืนค่า false ถ้ายังไม่มี token (เช่นยังไม่ได้ล็อกอิน) โดยไม่พยายามเชื่อมต่อ
export function connectWithAuth() {
  const token = getToken();
  if (!token) return false;
  if (socket.connected) return true;
  socket.auth = { token };
  socket.connect();
  return true;
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}
