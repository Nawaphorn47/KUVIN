import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useApp } from "./AppContext";

// พื้นที่ให้บริการที่แอปกำลังใช้อยู่ (ชื่อ/โลโก้ที่โชว์, จุดกลางแผนที่, สถานที่, เบอร์ฉุกเฉิน, อัตราค่าโดยสาร)
//   คนขับ   : พื้นที่ที่สังกัดเสมอ (คิวรับงานผูกกับพื้นที่นั้น)
//   ผู้โดยสาร : พื้นที่ที่เลือกไว้ล่าสุด → ถ้าไม่เคยเลือก หาจาก GPS → ไม่ได้ก็ใช้พื้นที่แรกในรายการ (เปลี่ยนเองได้ตลอด)
const AreaContext = createContext(null);
const STORAGE_KEY = "kuvin_area";

function savedAreaId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveAreaId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage ใช้ไม่ได้ — จำไม่ได้ข้ามการเปิดแอปก็ไม่เป็นไร
  }
}

function currentPosition() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator) || !window.isSecureContext) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}

export function AreaProvider({ children }) {
  const { mode, driver } = useApp();
  const [areas, setAreas] = useState(null); // null = กำลังโหลด
  const [areaId, setAreaIdState] = useState(savedAreaId);
  const [loadError, setLoadError] = useState(false);

  const loadAreas = useCallback(() => {
    setLoadError(false);
    api
      .get("/areas")
      .then(({ data }) => setAreas(data))
      .catch(() => {
        setAreas([]);
        setLoadError(true);
      });
  }, []);

  useEffect(loadAreas, [loadAreas]);

  // ผู้โดยสารที่ยังไม่เคยเลือกพื้นที่ (หรือพื้นที่ที่จำไว้ถูกปิดไปแล้ว) → หาจาก GPS
  useEffect(() => {
    if (!areas || areas.length === 0) return;
    if (areaId && areas.some((a) => a.id === areaId)) return;
    let cancelled = false;
    (async () => {
      const pos = await currentPosition();
      let detected = null;
      if (pos) {
        detected = await api
          .get("/areas/resolve", { params: pos })
          .then(({ data }) => data.id)
          .catch(() => null);
      }
      if (!cancelled) setAreaIdState(detected ?? areas[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, [areas, areaId]);

  const setAreaId = useCallback((id) => {
    setAreaIdState(id);
    saveAreaId(id);
  }, []);

  // คนขับใช้พื้นที่ที่สังกัดเสมอ ไม่สนพื้นที่ที่เลือกไว้ตอนเป็นผู้โดยสาร
  const effectiveId = mode === "driver" && driver?.areaId ? driver.areaId : areaId;
  const area = areas?.find((a) => a.id === effectiveId) ?? null;

  const value = useMemo(
    () => ({ areas: areas ?? [], area, setAreaId, loading: areas === null, loadError, reload: loadAreas }),
    [areas, area, setAreaId, loadError, loadAreas]
  );

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
}

export function useArea() {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error("useArea must be used within AreaProvider");
  return ctx;
}
