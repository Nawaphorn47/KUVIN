import { useEffect, useRef } from "react";
import { api } from "./api";
import { socket, connectWithAuth } from "./socket";

const POLL_MS = 5000;

// ติดตามสถานะคำขอหนึ่งรายการฝั่งผู้โดยสาร (หน้ารอคนขับ/คนขับกำลังมา/ระหว่างเดินทาง) — onUpdate ถูกเรียกทุกครั้งที่ได้สถานะใหม่
//
// เดิมแต่ละหน้า join room ของคำขอครั้งเดียวตอนเปิดหน้า + เช็คสถานะครั้งเดียว แล้วรอ event จาก socket อย่างเดียว:
// พอ socket หลุดแล้วต่อใหม่ (เน็ตมือถือกระตุก, เบราว์เซอร์พักแท็บ, server restart) server ลืม room ทั้งหมดของ connection เก่า
// → event "คนขับรับงานแล้ว" ส่งไปไม่ถึง ผู้โดยสารค้างหน้า "กำลังค้นหาวิน" ตลอดไปทั้งที่คนขับรับไปแล้ว
// จึง join ใหม่ทุกครั้งที่ (re)connect + ดึงสถานะล่าสุดเก็บตกสิ่งที่พลาดระหว่างหลุด + poll สำรองเป็นระยะ
export function useRequestStatus(requestId, onUpdate) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    if (!requestId) return undefined;
    let active = true;

    function deliver(updated) {
      if (active && updated?.id === requestId) onUpdateRef.current(updated);
    }

    function refresh() {
      api
        .get(`/service-requests/${requestId}`)
        .then(({ data }) => deliver(data))
        .catch(() => {});
    }

    // room ผูกกับ connection — ต้อง join ใหม่ทุกครั้งที่ต่อติด ไม่ใช่แค่ตอน mount (ดู DriverPresenceContext ฝั่งคนขับ)
    function join() {
      socket.emit("user:join");
      socket.emit("service-request:watch", requestId);
      refresh();
    }

    socket.on("connect", join);
    socket.on("service-request:status", deliver);
    connectWithAuth();
    if (socket.connected) join();
    else refresh(); // ยังไม่ต่อติดก็เช็คสถานะผ่าน REST ไปก่อน ไม่ต้องรอ socket

    const timer = setInterval(refresh, POLL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") refresh(); // กลับมาเปิดแอป/แท็บ = เช็คทันที ไม่ต้องรอรอบ poll
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      socket.off("connect", join);
      socket.off("service-request:status", deliver);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [requestId]);
}
