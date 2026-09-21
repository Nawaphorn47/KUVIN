import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { currentDriver, currentUser } from "../lib/mockData";
import { api } from "../lib/api";
import { getToken } from "../lib/auth";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [mode, setMode] = useState("user"); // "user" | "driver"
  const [booking, setBooking] = useState({
    pickup: "ตำแหน่งปัจจุบัน",
    destination: null, // { landmarkId, name } | null
  });
  const [me, setMe] = useState(null); // โปรไฟล์จริงของบัญชีที่ login อยู่ (null = ไม่มี session/ยังโหลดไม่เสร็จ)

  // ดึงโปรไฟล์จริงของบัญชีที่ login อยู่ตอนนี้ — เรียกตอน mount และหลัง login/register/logout สำเร็จ
  // (เปลี่ยน token ใน localStorage เฉย ๆ ไม่ทำให้ context นี้รู้ตัวเอง ต้องเรียกเองทุกจุดที่ setToken/clearToken)
  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setMe(null);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      if (data.role === "user") {
        const { data: trips } = await api
          .get("/service-requests/mine", { params: { status: "COMPLETED" } })
          .catch(() => ({ data: [] }));
        setMe({
          role: "user",
          name: data.fullName,
          email: data.email,
          phone: data.phone,
          avatarInitial: data.fullName?.[0] ?? "?",
          totalTrips: trips.length,
        });
      } else if (data.role === "driver") {
        const [{ data: full }, { data: trips }] = await Promise.all([
          api.get("/drivers/me"),
          api.get("/service-requests/driver/mine", { params: { status: "COMPLETED" } }).catch(() => ({ data: [] })),
        ]);
        setMe({
          role: "driver",
          name: full.fullName,
          phone: full.phone,
          vinNumber: full.vinNumber,
          plate: full.licensePlate,
          vehicleModel: full.vehicleModel,
          rating: full.ratingAvg ?? "-",
          totalTrips: trips.length,
          yearsActive: Math.max(0, Math.floor((Date.now() - new Date(full.createdAt).getTime()) / (365 * 24 * 3600 * 1000))),
        });
      } else {
        setMe(null);
      }
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => setMode((m) => (m === "user" ? "driver" : "user")),
      setMode,
      booking,
      setBooking,
      refreshMe,
      user: me?.role === "user" ? me : currentUser,
      driver: me?.role === "driver" ? me : currentDriver,
    }),
    [mode, booking, me, refreshMe]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
