// ข้อความอธิบายว่าทำไมใช้ GPS ไม่ได้ (code จาก useGeolocation)
export function gpsMessage(code) {
  if (code === "insecure") return "เปิดผ่าน HTTP จึงใช้ GPS ไม่ได้ (ต้องเป็น HTTPS หรือ localhost)";
  if (code === "denied") return "ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง กรุณาเปิดสิทธิ์ตำแหน่งในเบราว์เซอร์";
  return "ยังหาตำแหน่งของคุณไม่ได้";
}
