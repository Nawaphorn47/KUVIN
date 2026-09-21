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
