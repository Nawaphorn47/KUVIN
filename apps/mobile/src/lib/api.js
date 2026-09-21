import axios from "axios";
import { getToken, clearToken, setSessionNotice } from "./auth";

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

// backend ตอบ error เป็น { error: "..." } แต่หน้าจอทั้งหมดอ่าน err.response.data.message — แปลงให้ครั้งเดียวที่นี่
// ไม่งั้นข้อความจริงจาก server (เช่น "รหัสผ่านไม่ถูกต้อง") จะไม่เคยถูกแสดง เห็นแค่ข้อความสำรอง
// บัญชีถูกระงับระหว่างใช้งาน (ACCOUNT_SUSPENDED) → ล้าง session แล้วพากลับหน้า login พร้อมบอกเหตุผล
// (ถ้ายังไม่มี token = เพิ่งพยายาม login ไม่ผ่านเพราะถูกระงับ ให้หน้า login แสดงข้อความเองตามปกติ)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    if (data && typeof data === "object" && data.error && !data.message) data.message = data.error;

    if (data?.code === "ACCOUNT_SUSPENDED" && getToken()) {
      clearToken();
      setSessionNotice(data.message);
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

// อัปโหลดไฟล์รูปเดียว (เช่น รูปยืนยันตัวตนคนขับ) ผ่าน POST /api/uploads แล้วคืน url ที่ได้กลับมา
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/uploads", formData);
  return data.url;
}
