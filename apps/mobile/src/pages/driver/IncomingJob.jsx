import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Navigation2, Flag, Ruler, Coins } from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import { api } from "../../lib/api";

function normalizeJob(raw) {
  if (!raw?.id) return null;
  return {
    id: raw.id,
    passengerName: raw.user?.fullName ?? "ผู้โดยสาร",
    pickup: raw.pickupAddress ?? "จุดนัดพบ",
    dropoff: raw.destinationAddress ?? "-",
    distanceKm: raw.distanceKm ?? null,
    fare: raw.fare ?? null,
    offerExpiresAt: raw.offerExpiresAt,
  };
}

export default function IncomingJob() {
  const navigate = useNavigate();
  const location = useLocation();
  const job = normalizeJob(location.state);

  const totalMs = job ? Math.max(0, new Date(job.offerExpiresAt).getTime() - Date.now()) : 0;
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!job) {
      navigate("/driver/home");
      return;
    }
    const interval = setInterval(() => {
      const left = Math.max(0, new Date(job.offerExpiresAt).getTime() - Date.now());
      setRemainingMs(left);
      if (left <= 0) {
        clearInterval(interval);
        // คิวจริง: server เลื่อนไปเสนอคนถัดไปเองอัตโนมัติเมื่อหมดเวลา ฝั่งนี้แค่ออกจากหน้าจอ
        navigate("/driver/home");
      }
    }, 200);
    return () => clearInterval(interval);
  }, [job, navigate]);

  if (!job) return null;

  const remainingS = Math.ceil(remainingMs / 1000);
  const progress = totalMs > 0 ? remainingMs / totalMs : 0;

  async function handleDecline() {
    setBusy(true);
    try {
      await api.post(`/service-requests/${job.id}/decline`);
    } catch {
      // เลยเวลาไปแล้ว/ถูกจัดการไปแล้วก็ไม่เป็นไร แค่ออกจากหน้าจอ
    } finally {
      navigate("/driver/home");
    }
  }

  async function handleAccept() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/service-requests/${job.id}/accept`);
      navigate("/driver/navigate-pickup", { state: { request: data } });
    } catch (err) {
      setError(err.response?.data?.message || "รับงานไม่สำเร็จ อาจถูกคนอื่นรับไปแล้ว");
      setBusy(false);
      setTimeout(() => navigate("/driver/home"), 1500);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-end bg-slate-900/95">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="flex flex-col gap-5 rounded-t-3xl bg-white p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600">ถึงคิวคุณแล้ว!</p>
            <p className="text-3xl font-bold text-slate-900">งานใหม่เข้า</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-3xl font-bold tabular-nums text-slate-900">{remainingS}</span>
            <span className="text-xs text-slate-400">วินาที</span>
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className={progress < 0.25 ? "h-1.5 rounded-full bg-red-500" : "h-1.5 rounded-full bg-emerald-500"}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.2, ease: "linear" }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Avatar initial={job.passengerName[0]} size="lg" />
          <p className="text-lg font-bold text-slate-900">{job.passengerName}</p>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-col items-center pt-1">
            <Navigation2 className="h-4 w-4 text-emerald-600" />
            <span className="my-1 h-6 w-px border-l border-dashed border-slate-300" />
            <Flag className="h-4 w-4 text-slate-900" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400">รับที่</p>
            <p className="text-base font-semibold text-slate-900">{job.pickup}</p>
            <p className="mt-3 text-xs text-slate-400">ส่งที่</p>
            <p className="text-base font-semibold text-slate-900">{job.dropoff}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100 rounded-2xl bg-slate-50 py-3 text-center">
          <div className="flex flex-col items-center gap-0.5">
            <Ruler className="h-4 w-4 text-slate-400" />
            <p className="text-base font-bold text-slate-900">{job.distanceKm ?? "-"} กม.</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Coins className="h-4 w-4 text-amber-500" />
            <p className="text-xl font-bold text-amber-500">{job.fare ?? "-"} ฿</p>
          </div>
        </div>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            disabled={busy}
            className="h-14 flex-1 rounded-2xl bg-slate-100 text-lg font-bold text-slate-700 disabled:opacity-50"
          >
            ปฏิเสธ
          </button>
          <button
            onClick={handleAccept}
            disabled={busy}
            className="h-14 flex-1 rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-floating disabled:opacity-50"
          >
            รับงาน
          </button>
        </div>
      </motion.div>
    </div>
  );
}
