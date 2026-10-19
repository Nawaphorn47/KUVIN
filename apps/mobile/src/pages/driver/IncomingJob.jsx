import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import RouteSummary from "../../components/shared/RouteSummary";
import Button from "../../components/ui/Button";
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

// งานที่เสนอเข้ามาเต็มจอ ทีละงาน — ค่าวินเป็นตัวเลขใหญ่สุด เวลานับถอยหลังเป็นแถบหมดไปทางซ้าย ปุ่มรับ/ปฏิเสธใหญ่กดมือเดียวได้
// (คนขับมีเวลาตอบรับจำกัด จึงไม่มีอะไรอื่นให้ต้องอ่านนอกจากต้นทาง ปลายทาง ราคา)
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
  const urgent = progress < 0.35;

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
    <div className="flex min-h-0 flex-1 flex-col bg-brand-700 text-white">
      <header className="flex-none px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-100">ถึงคิวคุณแล้ว</p>
            <h1 className="text-[1.75rem] font-bold leading-tight">งานใหม่เข้า</h1>
          </div>
          <p className="tabular text-right" aria-live="off">
            <span className={urgent ? "text-fare text-amber-300" : "text-fare"}>{remainingS}</span>
            <span className="ml-1 text-base font-bold">วิ</span>
          </p>
        </div>
        {/* แถบเวลา: หมดไปทางซ้าย ช่วงท้ายเปลี่ยนเป็นสีเหลือง (ไม่ใช้แดง — แดงสงวนไว้ให้ตำแหน่งตัวเองกับ SOS) */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="เวลาที่เหลือในการตอบรับ">
          <motion.div
            className={urgent ? "h-2 rounded-full bg-amber-300" : "h-2 rounded-full bg-white"}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.2, ease: "linear" }}
          />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto rounded-t-2xl bg-slate-50 px-4 pb-4 pt-5 text-slate-900">
        <p className="tabular flex items-baseline justify-between gap-3">
          <span className="text-base font-semibold text-slate-600">{job.passengerName}</span>
          <span>
            <span className="text-fare text-slate-900">{job.fare ?? "-"}</span>
            <span className="ml-1 text-2xl font-bold">฿</span>
          </span>
        </p>
        <p className="tabular -mt-1 text-right text-sm text-slate-600">{job.distanceKm != null ? `${job.distanceKm} กม.` : ""}</p>

        <section aria-label="เส้นทาง" className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <RouteSummary pickup={job.pickup} destination={job.dropoff} />
        </section>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-here-soft px-3 py-2.5 text-center text-sm font-medium text-here">
            {error}
          </p>
        )}
      </main>

      <div className="flex flex-none gap-3 bg-slate-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
        <Button variant="secondary" onClick={handleDecline} disabled={busy} className="!h-16 flex-[2] !text-lg">
          ปฏิเสธ
        </Button>
        <Button onClick={handleAccept} disabled={busy} className="!h-16 flex-[3] !text-xl">
          รับงาน
        </Button>
      </div>
    </div>
  );
}
