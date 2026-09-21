import axios from "axios";
import { getToken } from "./auth";

// fallback ใช้ hostname เดียวกับที่เปิดหน้าเว็บอยู่ (ไม่ hardcode "localhost") — เวลาเข้าจากเครื่องอื่นในวง
// LAN เดียวกันผ่าน IP เครื่อง dev (เช่น http://192.168.1.23:5173) จะได้ยิง API ไปที่ IP เดียวกันโดยอัตโนมัติ
// แทนที่จะยิงไปหา localhost ของเครื่องตัวเอง (ซึ่งไม่มี backend รันอยู่)
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000/api`;

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// อัปโหลดไฟล์รูปเดียว (เช่น รูปยืนยันตัวตนคนขับ) ผ่าน POST /api/uploads แล้วคืน url ที่ได้กลับมา
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/uploads", formData);
  return data.url;
}
