import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Phone, CheckCircle2, AlertTriangle, X, Loader2 } from "lucide-react";
import TopBar from "../layout/TopBar";
import { emergencyContacts } from "../../lib/mockData";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";

const HOLD_MS = 1200; // ต้องกดค้างเท่านี้ก่อนจะยิงแจ้งเหตุจริง — กันกดโดนโดยไม่ตั้งใจ (ปุ่มนี้แดงเด่นมาก)
const LOGGABLE_NUMBERS = ["1669", "191"]; // ต้องตรงกับ VALID_EMERGENCY_NUMBERS ฝั่ง backend

// ใช้ได้ 2 แบบ: variant="sheet" (ผุดทับหน้าจอปัจจุบันระหว่างทริป ไม่เสียบริบทแผนที่/คนขับ — ใช้จาก
// DriverArriving/DuringRide) และ variant="page" (เต็มหน้าจอ ใช้กับ route /sos ตรง ๆ ตอนไม่ได้อยู่ระหว่างทริป)
// tripContext (เฉพาะ sheet): { pickup, dropoff, driverName? } โชว์ให้เห็นว่ายังอยู่ในบริบททริปเดิม ไม่ได้หลุดไปไหน
export default function SosPanel({ variant = "sheet", tripContext, onClose }) {
  const hasSession = Boolean(getToken());
  const [phase, setPhase] = useState("idle"); // idle | holding | sending | sent | error
  const [alertId, setAlertId] = useState(null);
  const [error, setError] = useState("");
  const holdTimer = useRef(null);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  function startHold() {
    if (phase === "sent" || phase === "sending") return;
    if (!hasSession) {
      setError("กรุณาเข้าสู่ระบบก่อนแจ้งเหตุฉุกเฉิน (โทรเบอร์ฉุกเฉินด้านล่างได้ทันทีโดยไม่ต้องล็อกอิน)");
      return;
    }
    setError("");
    setPhase("holding");
    holdTimer.current = setTimeout(sendSos, HOLD_MS);
  }

  function cancelHold() {
    if (phase !== "holding") return;
    clearTimeout(holdTimer.current);
    setPhase("idle");
  }

  async function sendSos() {
    setPhase("sending");
    try {
      const position = await getPositionSafe();
      const { data } = await api.post("/sos", {
        lat: position?.coords.latitude,
        lng: position?.coords.longitude,
      });
      setAlertId(data.id);
      setPhase("sent");
    } catch (err) {
      setError(err.response?.data?.message || "ส่งแจ้งเหตุไม่สำเร็จ กรุณาโทรเบอร์ฉุกเฉินด้านล่างโดยตรง");
      setPhase("error");
    }
  }

  async function handleCancelAlert() {
    const id = alertId;
    setPhase("idle");
    setAlertId(null);
    if (id) {
      try {
        await api.post(`/sos/${id}/cancel`);
      } catch {
        // ยกเลิกที่ backend ไม่สำเร็จก็ไม่เป็นไร — ฝั่งนี้กลับไปหน้าปกติได้เลย ไม่บล็อกผู้ใช้
      }
    }
  }

  function handleCallContact(phone) {
    if (alertId && LOGGABLE_NUMBERS.includes(phone)) {
      api.post(`/sos/${alertId}/contacted`, { contactedEmergencyNumber: phone }).catch(() => {});
    }
  }

  const body = (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 pb-8 pt-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-red-500">ต้องการความช่วยเหลือ?</h1>
        <p className="mt-2 text-sm text-slate-300">
          {phase === "sent"
            ? "เจ้าหน้าที่เห็นตำแหน่งของคุณแล้ว หากจำเป็นให้โทรเบอร์ฉุกเฉินด้านล่างต่อทันที"
            : "กดค้างปุ่มด้านล่าง 1 วินาทีเพื่อแจ้งเหตุฉุกเฉิน ระบบจะส่งตำแหน่งของคุณไปยังเจ้าหน้าที่ทันที"}
        </p>
      </div>

      <div className="relative flex h-40 w-40 items-center justify-center">
        {phase !== "sent" && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-500" />}
        <motion.button
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          disabled={phase === "sent" || phase === "sending"}
          whileTap={{ scale: 0.96 }}
          className="relative flex h-32 w-32 select-none flex-col items-center justify-center gap-1 overflow-hidden rounded-full bg-red-600 shadow-2xl disabled:opacity-90"
        >
          <motion.span
            className="absolute inset-0 origin-left bg-white/25"
            initial={false}
            animate={{ scaleX: phase === "holding" ? 1 : 0 }}
            transition={{ duration: phase === "holding" ? HOLD_MS / 1000 : 0.15, ease: "linear" }}
          />
          <span className="relative flex flex-col items-center gap-1">
            {phase === "sending" ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : phase === "sent" ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <ShieldAlert className="h-8 w-8" />
            )}
            <span className="text-xl font-bold">
              {phase === "sending" ? "กำลังส่ง..." : phase === "sent" ? "แจ้งแล้ว" : "SOS"}
            </span>
            <span className="text-[11px] text-white/80">
              {phase === "holding"
                ? "กำลังยืนยัน อย่าเพิ่งปล่อย..."
                : phase === "sent"
                  ? ""
                  : "กดค้างเพื่อขอความช่วยเหลือ"}
            </span>
          </span>
        </motion.button>
      </div>

      {phase === "sent" && (
        <button onClick={handleCancelAlert} className="text-xs text-slate-400 underline underline-offset-2">
          กดผิด / แจ้งเหตุพลาด — ยกเลิกรายการนี้
        </button>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-none" /> {error}
        </p>
      )}

      <div className="w-full text-left">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">ติดต่อฉุกเฉิน</p>
        <div className="flex flex-col divide-y divide-white/10 rounded-2xl bg-white/5">
          {emergencyContacts.map((c) => (
            <div key={c.label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium">{c.label}</span>
              <a
                href={`tel:${c.phone}`}
                onClick={() => handleCallContact(c.phone)}
                className="flex items-center gap-1.5 text-sm font-bold text-red-400"
              >
                <Phone className="h-3.5 w-3.5" /> {c.phone}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (variant === "page") {
    return (
      <div className="flex flex-1 flex-col bg-slate-900 text-white">
        <TopBar title="SOS ฉุกเฉิน" dark />
        {body}
      </div>
    );
  }

  // variant === "sheet": ผุดทับหน้าเดิม (พ่อแม่ต้องห่อด้วย AnimatePresence เอง เพื่อ animate ตอน mount/unmount)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl bg-slate-900 text-white"
      >
        <div className="flex items-center gap-3 px-5 pt-4">
          {tripContext && (
            <p className="flex-1 truncate text-xs text-slate-400">
              ทริปนี้ยังดำเนินอยู่: {tripContext.pickup} → {tripContext.dropoff}
              {tripContext.driverName ? ` · ${tripContext.driverName}` : ""}
            </p>
          )}
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {body}
      </motion.div>
    </motion.div>
  );
}

async function getPositionSafe() {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}
