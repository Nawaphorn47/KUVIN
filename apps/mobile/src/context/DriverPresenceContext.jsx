import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getToken } from "../lib/auth";
import { socket, connectWithAuth } from "../lib/socket";

const DriverPresenceContext = createContext(null);
const POLL_FALLBACK_MS = 5000; // ตาข่ายนิรภัยเผื่อ socket พลาด — ไม่ควรรอนานขนาดนี้ปกติ (ปกติ socket ไวกว่ามาก)

// เดิม logic นี้อยู่ใน DriverHome.jsx โดยตรง — บัค: listener ของ "service-request:new" ถูกถอดออกทันทีที่คนขับ
// กดออกจากหน้า DriverHome ไปหน้าอื่น (Profile/รายได้/ประวัติ) ทำให้พลาดงานที่เสนอเข้ามาระหว่างนั้นไปเลยเงียบ ๆ
// ย้ายมาไว้ระดับ App แล้ว (ครั้งที่ 1)
//
// บัคที่ 2 ที่เจอทีหลัง: ต่อให้ฟัง event ถูก room ตอน mount ครั้งแรก ถ้า socket หลุดแล้วต่อกลับมาใหม่ (reconnect —
// เกิดได้จาก network สะดุด, tab ถูก throttle ตอนอยู่เบื้องหลังนานๆ ฯลฯ) จะได้ socket id ใหม่ ห้อง private
// "driver:<id>" เดิมที่เคย join ไว้จะหายไปด้วย เพราะ effect นี้ไม่ re-run (dependency ไม่เปลี่ยน) เลยไม่มีใคร
// สั่ง join ห้องใหม่ให้ — งานเสนอเข้ามาแล้วแต่ event ไปไม่ถึงฝั่ง client เงียบๆ (ฝั่ง backend/REST ยังถูกต้องปกติ
// ถึงเห็นใน useQueueOverview ที่ poll REST ตรงๆ) แก้โดย: (1) join ห้องใหม่ทุกครั้งที่ socket "connect" ยิง (ยิงทั้ง
// ตอน connect ครั้งแรกและทุกครั้งที่ reconnect) แทนที่จะยิงครั้งเดียวตอน effect mount (2) เพิ่ม poll สำรองทุก 5
// วิ เช็ค /service-requests/pending ตรงๆ ถ้าเจอง่านที่ถึงคิวเราอยู่ (isMyTurn) ให้พาไปหน้ารับงานเองแม้ socket
// จะพลาดไปก็ตาม กันไม่ให้พลาดงานได้เด็ดขาดอีก
export function DriverPresenceProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [online, setOnline] = useState(null); // null = ยังไม่รู้สถานะจริง (กำลังโหลดจาก backend)
  const [notice, setNotice] = useState(""); // เหตุผลที่ระบบปรับเป็นออฟไลน์ให้ (timeout ครบ 3 ครั้ง)
  const hasSession = Boolean(getToken());
  const locationRef = useRef(location);
  locationRef.current = location;

  const refreshOnline = useCallback(() => {
    if (!hasSession) {
      setOnline(false);
      return;
    }
    api
      .get("/drivers/me")
      .then(({ data }) => setOnline(data.isOnline))
      .catch(() => setOnline(false));
  }, [hasSession]);

  useEffect(() => {
    refreshOnline();
  }, [refreshOnline]);

  useEffect(() => {
    if (!hasSession || online === null) return;

    function announcePresence() {
      socket.emit(online ? "driver:online" : "driver:offline");
    }

    if (online) connectWithAuth();
    announcePresence(); // เผื่อ socket ต่ออยู่แล้วตั้งแต่ก่อนหน้านี้
    socket.on("connect", announcePresence); // สำคัญ: ยิงซ้ำทุกครั้งที่ (re)connect ไม่ใช่แค่ตอน mount ครั้งแรก

    function goToIncomingJob(job) {
      if (locationRef.current.pathname === "/driver/incoming-job") return;
      navigate("/driver/incoming-job", { state: job });
    }
    socket.on("service-request:new", goToIncomingJob);

    // ปล่อยงานหมดเวลาติดกัน 3 ครั้ง server ปรับเป็นออฟไลน์+เอาออกจากคิวให้ — sync สถานะและแจ้งเหตุผลให้คนขับรู้
    function handleForcedOffline({ reason }) {
      setOnline(false);
      setNotice(reason ?? "");
    }
    socket.on("driver:forced-offline", handleForcedOffline);

    // ตาข่ายนิรภัย — poll ตรงเช็คว่าถึงคิวเราหรือยัง เผื่อ socket พลาดไปด้วยเหตุผลอะไรก็ตาม
    const poll = online
      ? setInterval(() => {
          if (locationRef.current.pathname === "/driver/incoming-job") return;
          api
            .get("/service-requests/pending")
            .then(({ data }) => {
              const mine = data.find((r) => r.isMyTurn);
              if (mine) goToIncomingJob(mine);
            })
            .catch(() => {});
        }, POLL_FALLBACK_MS)
      : null;

    return () => {
      socket.off("connect", announcePresence);
      socket.off("service-request:new", goToIncomingJob);
      socket.off("driver:forced-offline", handleForcedOffline);
      if (poll) clearInterval(poll);
    };
  }, [online, hasSession, navigate]);

  async function toggleOnline() {
    const next = !online;
    await api.patch("/drivers/me/availability", { isOnline: next });
    setOnline(next);
    setNotice("");
  }

  return (
    <DriverPresenceContext.Provider value={{ online, notice, toggleOnline, refreshOnline }}>
      {children}
    </DriverPresenceContext.Provider>
  );
}

export function useDriverPresence() {
  const ctx = useContext(DriverPresenceContext);
  if (!ctx) throw new Error("useDriverPresence must be used within DriverPresenceProvider");
  return ctx;
}
