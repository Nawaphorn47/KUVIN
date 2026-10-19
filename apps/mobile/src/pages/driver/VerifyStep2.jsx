import { Navigate } from "react-router-dom";

// เดิมส่งเอกสารแบ่งเป็น 2 ขั้น — ตอนนี้รวมเป็นหน้าเดียวตามประเภทคนขับ (VerifyStep1) ลิงก์เก่าพามาที่นั่น
export default function VerifyStep2() {
  return <Navigate to="/driver/verify/step-1" replace />;
}
