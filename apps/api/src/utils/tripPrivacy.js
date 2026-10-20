// ซ่อนเบอร์โทรของอีกฝ่าย เว้นแต่ทริปกำลังดำเนินอยู่ (คนขับรับงานแล้ว → ถึงปลายทาง)
// กันโทรตามภายหลังจากประวัติทริป และไม่ให้คนขับเห็นเบอร์ผู้โดยสารตอนแค่ถูกเสนองาน (ยังไม่ได้รับ)
// ติดต่อเรื่องหลังจบทริป (เช่น ลืมของ) ให้ใช้ "แจ้งปัญหา" ผ่านแอดมินแทน
const PHONE_VISIBLE = new Set(["ACCEPTED", "IN_PROGRESS"]);

const avatarPath = (file) => (file ? `/uploads/avatars/${file}` : null);

// แปลงชื่อไฟล์รูปโปรไฟล์ (avatarFile) ของผู้โดยสารและคนขับเป็น avatarUrl แล้วเอาฟิลด์ภายในออก
function withAvatars(request) {
  const out = { ...request };
  if (out.user && typeof out.user === "object") {
    const { avatarFile, ...user } = out.user;
    out.user = { ...user, avatarUrl: avatarPath(avatarFile) };
  }
  if (out.driver && typeof out.driver === "object") {
    const { user: owner, ...driver } = out.driver;
    out.driver = { ...driver, avatarUrl: avatarPath(owner?.avatarFile) };
  }
  return out;
}

function presentRequest(request) {
  if (Array.isArray(request)) return request.map(presentRequest);
  if (!request || typeof request !== "object" || !("status" in request)) return request;
  const out = withAvatars(request);
  if (PHONE_VISIBLE.has(request.status)) return out;
  if (out.user) out.user = { ...out.user, phone: null };
  if (out.driver) out.driver = { ...out.driver, phone: null };
  return out;
}

module.exports = { presentRequest, PHONE_VISIBLE };
