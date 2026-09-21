const TOKEN_KEY = "kuvin_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage ไม่พร้อมใช้งาน (private mode ฯลฯ) — ปล่อยผ่าน ไม่ทำให้แอปพัง
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ดู setToken
  }
}

// role ("user" | "driver" | "admin") จาก payload ของ JWT — อ่านฝั่ง client เพื่อตัดสินใจว่าจะเรียก API ฝั่งไหน
// เท่านั้น (ไม่ใช่การตรวจสิทธิ์ ฝั่ง server ตรวจ token เองทุก request)
export function getTokenRole() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role ?? null;
  } catch {
    return null;
  }
}
