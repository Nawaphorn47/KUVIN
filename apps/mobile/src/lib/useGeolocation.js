import { useEffect, useState } from "react";

// ตำแหน่ง GPS ของอุปกรณ์ — watch=true ติดตามต่อเนื่อง (ใช้ฝั่งคนขับระหว่างทริป), false = อ่านครั้งเดียว
// หมายเหตุ: browser อนุญาต geolocation เฉพาะ secure context (HTTPS หรือ localhost) การเปิดผ่าน http://<IP ในวง LAN>
// จะไม่ได้ตำแหน่ง (error = "insecure" ให้ UI แจ้งผู้ใช้/ใช้ค่าสำรองแทน)
export function useGeolocation({ watch = false, enabled = true } = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null); // null | "unsupported" | "insecure" | "denied" | "unavailable"

  useEffect(() => {
    if (!enabled) return undefined;
    if (!("geolocation" in navigator)) {
      setError("unsupported");
      return undefined;
    }
    if (!window.isSecureContext) {
      setError("insecure");
      return undefined;
    }

    const onOk = (p) => {
      setError(null);
      setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
    };
    const onErr = (e) => setError(e.code === 1 ? "denied" : "unavailable");

    if (watch) {
      const id = navigator.geolocation.watchPosition(onOk, onErr, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      });
      return () => navigator.geolocation.clearWatch(id);
    }
    navigator.geolocation.getCurrentPosition(onOk, onErr, { timeout: 8000 });
    return undefined;
  }, [watch, enabled]);

  return { position, error };
}
