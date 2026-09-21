import axios from "axios";
import { getToken } from "../lib/auth";

// fallback ใช้ hostname เดียวกับที่เปิดหน้าเว็บอยู่ (ไม่ hardcode "localhost") — รองรับเข้าจากเครื่องอื่นในวง
// LAN เดียวกันผ่าน IP เครื่อง dev ได้โดยไม่ต้องตั้งค่าอะไรเพิ่ม (ดูเหตุผลเดียวกันใน apps/mobile/src/lib/api.js)
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// backend ตอบ error เป็น { error: "..." } แต่หน้าจอทั้งหมดอ่าน err.response.data.message — แปลงให้ครั้งเดียวที่นี่
// ไม่งั้นข้อความจริงจาก server (เช่น "ต้องระบุเหตุผล") จะไม่เคยถูกแสดง เห็นแค่ข้อความสำรอง
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    if (data && typeof data === "object" && data.error && !data.message) data.message = data.error;
    return Promise.reject(error);
  }
);
