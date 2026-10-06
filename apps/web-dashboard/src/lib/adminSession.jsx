import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setScopeAreaId } from "../services/api";
import { getToken, clearToken } from "./auth";

// ข้อมูลแอดมินที่ล็อกอินอยู่ + พื้นที่ที่กำลังดู
// - SUPER_ADMIN: เลือกดู "ทุกพื้นที่" หรือเจาะพื้นที่เดียวได้ (ส่ง header X-Area-Id ให้ backend กรอง)
// - AREA_ADMIN: เห็นเฉพาะพื้นที่ตัวเองเสมอ (backend บังคับอยู่แล้ว ไม่ว่าจะส่ง header อะไรมา)
const AREA_KEY = "kuvin_admin_area";

function readSavedArea() {
  try {
    return localStorage.getItem(AREA_KEY) || "";
  } catch {
    return "";
  }
}

const AdminSessionContext = createContext(null);

export function AdminSessionProvider({ children }) {
  const [admin, setAdmin] = useState(null); // null = ยังไม่โหลด/ไม่มี session
  const [areas, setAreas] = useState([]);
  const [areaId, setAreaIdState] = useState(readSavedArea);
  const [ready, setReady] = useState(false);

  const isSuper = admin?.adminRole === "SUPER_ADMIN";

  const reloadAreas = useCallback(async () => {
    const { data } = await api.get("/admin/areas");
    setAreas(data);
    return data;
  }, []);

  const load = useCallback(async () => {
    if (!getToken()) {
      setAdmin(null);
      setReady(true);
      return;
    }
    try {
      const { data: me } = await api.get("/auth/me");
      if (me.role !== "admin") throw new Error("not admin");
      const list = await reloadAreas();
      if (me.adminRole === "SUPER_ADMIN") {
        // พื้นที่ที่จำไว้ถูกลบ/ไม่มีแล้ว → กลับไปดูทุกพื้นที่
        const saved = readSavedArea();
        const valid = list.some((a) => a.id === saved) ? saved : "";
        setScopeAreaId(valid || null);
        setAreaIdState(valid);
      } else {
        setScopeAreaId(null);
        setAreaIdState(me.area?.id ?? "");
      }
      setAdmin(me);
    } catch {
      clearToken();
      setAdmin(null);
    } finally {
      setReady(true);
    }
  }, [reloadAreas]);

  useEffect(() => {
    load();
  }, [load]);

  const setAreaId = useCallback(
    (id) => {
      if (!isSuper) return;
      setScopeAreaId(id || null);
      setAreaIdState(id);
      try {
        localStorage.setItem(AREA_KEY, id);
      } catch {
        // ไม่จำก็ไม่เป็นไร
      }
    },
    [isSuper]
  );

  const logout = useCallback(() => {
    clearToken();
    setScopeAreaId(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({
      admin,
      isSuper,
      areas,
      areaId, // "" = ทุกพื้นที่ (super เท่านั้น)
      area: areas.find((a) => a.id === areaId) ?? null,
      setAreaId,
      reloadAreas,
      reload: load,
      logout,
      ready,
    }),
    [admin, isSuper, areas, areaId, setAreaId, reloadAreas, load, logout, ready]
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error("useAdminSession must be used inside AdminSessionProvider");
  return ctx;
}
