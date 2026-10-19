import { useEffect, useState } from "react";
import { api } from "./api";

// หน้าแรกของโหมดคนขับตามสถานะการยืนยันตัวตน — ใช้ทั้งตอนล็อกอินและตอนสลับโหมด
// ยังไม่ส่งเอกสาร (ไม่มีรูปหน้าตรง) = เพิ่งสมัครขับ → พาไปแนบเอกสารก่อน
export function driverLanding(driver) {
  if (driver.verificationStatus === "APPROVED") return ["/driver/home"];
  if (driver.verificationStatus === "REJECTED") {
    return ["/driver/verify/rejected", { state: { reason: driver.rejectionReason } }];
  }
  return [driver.photoUrl ? "/driver/verify/pending" : "/driver/verify/step-1"];
}

// วิธีเข้าระบบที่ server เปิดอยู่ (OTP โหมดทดสอบ/ส่งจริง/ปิด, Google client id) — โหลดครั้งเดียวต่อการเปิดแอป
let configPromise = null;
export function useAuthConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    configPromise ??= api
      .get("/auth/config")
      .then(({ data }) => data)
      .catch(() => {
        configPromise = null; // โหลดไม่ได้ (เน็ตหลุด) ให้ลองใหม่รอบหน้า
        return { otp: "off", googleClientId: null, passengerVerification: true };
      });
    let alive = true;
    configPromise.then((c) => alive && setConfig(c));
    return () => {
      alive = false;
    };
  }, []);
  return config;
}
