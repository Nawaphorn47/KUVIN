import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { getToken } from "../lib/auth";
import { registerPush } from "../lib/push";

const AppContext = createContext(null);

// ค่าระหว่างยังโหลดโปรไฟล์ไม่เสร็จ/ไม่มี session — เดิมใช้ข้อมูล mock (คนขับชื่อ "สมชาย วินมอเตอร์" คะแนน 4.8 1,247 เที่ยว)
// ทำให้คนขับที่ยังไม่มีคะแนนเห็นคะแนนปลอม และชื่อ mock ตรงกับคนขับเดโมเบอร์วิน 1 พอดี จนดูเหมือนข้อมูลคนขับปนกัน
const EMPTY_USER = { name: "", email: "", phone: "", avatarInitial: "", totalTrips: "-" };
const EMPTY_DRIVER = { name: "", phone: "", vinNumber: "-", plate: "-", vehicleModel: "-", rating: "-", totalTrips: "-", yearsActive: "-" };

export function AppProvider({ children }) {
  const [mode, setMode] = useState("user"); // "user" | "driver"
  const [booking, setBooking] = useState({
    pickup: "ตำแหน่งปัจจุบัน",
    destination: null, // { landmarkId, name } | null
  });
  const [me, setMe] = useState(null); // โปรไฟล์จริงของบัญชีที่ login อยู่ (null = ไม่มี session/ยังโหลดไม่เสร็จ)

  // ดึงโปรไฟล์จริงของบัญชีที่ login อยู่ตอนนี้ — เรียกตอน mount และหลัง login/register/logout สำเร็จ
  // (เปลี่ยน token ใน localStorage เฉย ๆ ไม่ทำให้ context นี้รู้ตัวเอง ต้องเรียกเองทุกจุดที่ setToken/clearToken)
  const lastToken = useRef(null);
  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      lastToken.current = null;
      setMe(null);
      return;
    }
    // สลับบัญชี (token เปลี่ยน) → ล้างโปรไฟล์ของบัญชีเดิมทิ้งทันที ไม่ให้หน้าจอโชว์ชื่อ/คะแนนของคนก่อนหน้าระหว่างรอโหลด
    if (lastToken.current !== token) {
      lastToken.current = token;
      setMe(null);
    }
    try {
      const { data } = await api.get("/auth/me");
      if (getToken() !== token) return; // ระหว่างรอมีการสลับบัญชีอีก — ผลนี้เป็นของบัญชีเก่าแล้ว
      // sync mode กับ role จริงของ session เสมอ — เดิม mode ตั้งแค่ตอน login/register/verify สำเร็จ พอ reload
      // เต็มหน้า (เช่น กด F5 หรือเปิดลิงก์ตรง) mode รีเซ็ตกลับเป็น "user" ค่าเริ่มต้น ทั้งที่ token จริงเป็นคนขับ
      // ทำให้ BottomNav โชว์เมนูผิด role (เช่น ไม่มีแท็บรายได้/แจ้งเตือนของคนขับ) จนกว่าจะ toggle เอง
      if (data.role === "user" || data.role === "driver") {
        setMode(data.role);
        registerPush(data.role); // ไม่ await — ขอสิทธิ์แจ้งเตือนอาจค้างรอผู้ใช้กด ไม่ควรบล็อกการโหลดโปรไฟล์
      }
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
      user: me?.role === "user" ? me : EMPTY_USER,
      driver: me?.role === "driver" ? me : EMPTY_DRIVER,
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
