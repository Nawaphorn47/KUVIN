import { useEffect, useRef, useState } from "react";
import { socket, connectWithAuth } from "./socket";
import { useGeolocation } from "./useGeolocation";

const SEND_INTERVAL_MS = 3000;

// ฝั่งคนขับ: อ่าน GPS ต่อเนื่องแล้วส่งตำแหน่งสดเข้า room ของคำขอ (ผู้โดยสารเห็นหมุดเคลื่อนที่) — คืนตำแหน่งปัจจุบันไว้วาดแผนที่ด้วย
export function useDriverTracking(requestId) {
  const { position, error } = useGeolocation({ watch: true, enabled: Boolean(requestId) });
  const lastSent = useRef(0);

  useEffect(() => {
    if (!position || !requestId) return;
    const now = Date.now();
    if (now - lastSent.current < SEND_INTERVAL_MS) return;
    lastSent.current = now;
    connectWithAuth();
    socket.emit("driver:location", { requestId, lat: position.lat, lng: position.lng });
  }, [position, requestId]);

  return { position, error };
}

// ฝั่งผู้โดยสาร: รับตำแหน่งสดของคนขับที่ส่งเข้า room ของคำขอนี้ (ต้องเรียก service-request:watch ก่อนแล้ว)
// initial = ตำแหน่งล่าสุดที่ server เก็บไว้ (request.driver.currentLat/Lng) เพื่อมีหมุดตั้งแต่เข้าหน้า ไม่ต้องรอ event แรก
export function useDriverLocation(requestId, initial) {
  const [location, setLocation] = useState(
    initial?.currentLat != null ? { lat: initial.currentLat, lng: initial.currentLng } : null
  );

  useEffect(() => {
    if (!requestId) return undefined;
    function handle(p) {
      if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) setLocation({ lat: p.lat, lng: p.lng });
    }
    socket.on("driver:location", handle);
    return () => socket.off("driver:location", handle);
  }, [requestId]);

  return location;
}
