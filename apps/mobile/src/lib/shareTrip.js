import { api } from "./api";

// ลิงก์หน้าเว็บสาธารณะที่คนรับเปิดได้โดยไม่ต้องลงแอป — แอป Android (Capacitor) ไม่มี origin ที่เปิดจากข้างนอกได้
// จึงต้องตั้ง VITE_PUBLIC_APP_URL เป็นโดเมนเว็บแอปจริง (เช่น https://web-app-production-6f95.up.railway.app)
const PUBLIC_APP_URL =
  import.meta.env.VITE_PUBLIC_APP_URL || (window.location.protocol.startsWith("http") ? window.location.origin : "");

// สร้างลิงก์แชร์ทริป (อายุ 6 ชม. ดูตำแหน่งได้เฉพาะตอนทริปยังไม่จบ) แล้วเปิดเมนูแชร์ของเครื่อง / คัดลอกลิงก์
// คืน "shared" | "copied" | "cancelled"
export async function shareTrip(request) {
  if (!PUBLIC_APP_URL) throw new Error("ยังไม่ได้ตั้งค่าที่อยู่เว็บสำหรับแชร์ (VITE_PUBLIC_APP_URL)");
  const { data } = await api.post(`/service-requests/${request.id}/share`);
  const url = `${PUBLIC_APP_URL}/track/${data.token}`;
  const text = `กำลังนั่งวินไป ${request.destinationAddress ?? "ปลายทาง"} ดูตำแหน่งสดได้ที่ลิงก์นี้`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "ติดตามทริป KU VIN", text, url });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled";
    }
  }
  await navigator.clipboard.writeText(`${text}\n${url}`);
  return "copied";
}
