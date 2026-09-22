import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";
import { getToken } from "./auth";

// สถานะทริป -> หน้าที่ควรอยู่ (ตามสถานะจริงจาก backend เท่านั้น — ไม่มีฟิลด์แยก "นำทางไปรับ" กับ "ถึงจุดรับแล้ว"
// ทั้งสองฝั่ง ACCEPTED เดียวกัน จึงพากลับไปหน้านำทางเสมอ กดปุ่ม "ถึงจุดรับแล้ว" ซ้ำได้ถ้าที่จริงถึงแล้ว)
const USER_ROUTES = { PENDING: "/searching-driver", ACCEPTED: "/driver-arriving", IN_PROGRESS: "/during-ride" };
const DRIVER_ROUTES = { ACCEPTED: "/driver/navigate-pickup", IN_PROGRESS: "/driver/during-ride" };

// เช็คว่ามีทริปที่ยังไม่จบ (หรือจบแล้วแต่ยังไม่ได้ชำระเงิน) ค้างอยู่ไหม ถ้ามีพาไปหน้าที่ตรงสถานะทันที แทนที่จะ
// โผล่หน้าแรกเฉย ๆ เหมือนไม่มีอะไรเกิดขึ้น (เดิมไม่มีกลไกนี้เลยทั้งฝั่งผู้โดยสารและคนขับ — ปิดแอป/รีเฟรชกลางทริป
// แล้วหาทางกลับไปดู/ทำต่อไม่เจอ ฝั่งผู้โดยสารเรียกวินใหม่ก็ไม่ได้เพราะ backend บล็อกไว้ แต่ไม่มีทางยกเลิก/ดูอันเดิม)
// เรียกที่หน้าแรกของแต่ละ role (Home.jsx / DriverHome.jsx) — คืน true ระหว่างที่ยังเช็คอยู่ (โชว์ loading กันแฟลชหน้าเปล่า)
export function useResumeActiveTrip(role) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const isDriver = role === "driver";
  const routes = isDriver ? DRIVER_ROUTES : USER_ROUTES;
  const completedPath = isDriver ? "/driver/finish-ride" : "/ride-completed";
  const endpoint = isDriver ? "/service-requests/driver/mine" : "/service-requests/mine";

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return undefined;
    }
    let cancelled = false;
    api
      .get(endpoint)
      .then(({ data }) => {
        if (cancelled) return;
        const active = data.find((r) => routes[r.status] || (r.status === "COMPLETED" && r.paymentStatus !== "PAID"));
        if (active) {
          const path = routes[active.status] ?? completedPath;
          navigate(path, { replace: true, state: { request: active } });
          return; // ไม่เซ็ต checking=false เพราะกำลังจะออกจากหน้านี้อยู่แล้ว
        }
        setChecking(false);
      })
      .catch(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
    // routes/completedPath คงที่ตาม role ไม่ต้องอยู่ใน deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, navigate]);

  return checking;
}
