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

// ข้อความที่ต้องแจ้งผู้ใช้หลังถูกพากลับหน้า login (เช่น บัญชีถูกระงับ) — แสดงครั้งเดียวแล้วลบ
const NOTICE_KEY = "kuvin_notice";

export function setSessionNotice(message) {
  try {
    sessionStorage.setItem(NOTICE_KEY, message);
  } catch {
    // ไม่มี sessionStorage — ข้ามไป
  }
}

// อ่านโดยไม่ลบ + ลบแยก: ถ้าอ่านแล้วลบในขั้นตอนเดียว React StrictMode (เรียก initializer ของ useState 2 ครั้งตอน dev)
// จะทำให้ครั้งที่สองอ่านได้ค่าว่าง ข้อความหาย — ให้ลบใน useEffect หลัง mount แทน
export function peekSessionNotice() {
  try {
    return sessionStorage.getItem(NOTICE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearSessionNotice() {
  try {
    sessionStorage.removeItem(NOTICE_KEY);
  } catch {
    // ไม่มี sessionStorage — ข้ามไป
  }
}
