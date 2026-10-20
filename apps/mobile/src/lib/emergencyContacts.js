// เบอร์ฉุกเฉินที่แสดงในแผง SOS / หน้าตั้งค่า / ผู้ช่วยตอบคำถาม — ต้องเป็นเบอร์จริงเท่านั้น ห้ามใส่เบอร์ตัวอย่าง/เดาเอา
// แต่ละวิทยาเขตตั้งเบอร์ของตัวเองในหน้าแอดมิน (เช่น รปภ. มก. กำแพงแสน 034-351-151 ตรวจจากเว็บวิทยาเขตแล้ว)
// วิทยาเขตที่ยังไม่ได้ตั้ง หรือยังโหลดวิทยาเขตไม่เสร็จ ใช้เบอร์ระดับประเทศที่ใช้ได้ทุกที่แทน
export const NATIONAL_EMERGENCY = [
  { label: "ตำรวจ", phone: "191" },
  { label: "หน่วยแพทย์ฉุกเฉิน (EMS)", phone: "1669" },
];

export function emergencyContactsFor(area) {
  const own = Array.isArray(area?.emergencyContacts) ? area.emergencyContacts : [];
  if (own.length === 0) return NATIONAL_EMERGENCY;
  // เบอร์ระดับประเทศต้องมีเสมอ แม้วิทยาเขตจะไม่ได้ใส่ไว้
  const missing = NATIONAL_EMERGENCY.filter((n) => !own.some((c) => c.phone === n.phone));
  return [...own, ...missing];
}
