import { useEffect, useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { Banknote, Check } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../../components/ui/Button";
import PaymentQr from "../../components/shared/PaymentQr";
import SlipUploader from "../../components/shared/SlipUploader";
import TripHeader from "../../components/shared/TripHeader";
import TripRail from "../../components/shared/TripRail";
import { api } from "../../lib/api";

export default function RideCompleted() {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = location.state?.request;
  const [paid, setPaid] = useState(initial?.paymentStatus === "PAID");
  const [slipEnabled, setSlipEnabled] = useState(false);

  // คนขับอาจกดยืนยันรับเงิน (เช่นจ่ายสด) ขณะที่ผู้โดยสารยังอยู่หน้านี้ — เช็คสถานะเป็นระยะ
  useEffect(() => {
    if (!initial?.id || paid) return undefined;
    const t = setInterval(() => {
      api
        .get(`/service-requests/${initial.id}`)
        .then(({ data }) => data.paymentStatus === "PAID" && setPaid(true))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [initial?.id, paid]);

  const request = initial;
  if (!request) return <Navigate to="/home" replace />;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TripHeader status={`ถึง ${request.destinationAddress ?? "ปลายทาง"} แล้ว · ค่าวินทั้งหมด`} value={request.fare} unit="฿" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {paid ? (
          <motion.p
            role="status"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="flex items-center gap-3 rounded-xl bg-brand-50 p-4 text-base font-bold text-brand-800 ring-1 ring-brand-200"
          >
            <span className="flex h-9 w-9 -rotate-6 items-center justify-center rounded-full bg-brand-600 text-white shadow-sticker">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            จ่ายเรียบร้อย ขอบคุณที่ใช้วิน!
          </motion.p>
        ) : (
          <section aria-labelledby="pay-title" className="flex flex-col gap-3">
            <h2 id="pay-title" className="text-base font-bold text-slate-900">
              จ่ายค่าวิน
            </h2>
            <PaymentQr requestId={request.id} onLoaded={(qr) => setSlipEnabled(Boolean(qr.slipVerification))} />
            {slipEnabled && <SlipUploader requestId={request.id} onPaid={() => setPaid(true)} />}
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Banknote className="h-4 w-4 flex-none text-slate-500" />
              {slipEnabled ? "จ่ายเงินสดก็ได้ คนขับจะกดยืนยันว่ารับเงินแล้ว" : "หรือจ่ายเงินสดให้คนขับโดยตรง"}
            </p>
          </section>
        )}

        <section className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <TripRail stage={4} request={request} />
          <p className="tabular mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600">
            {request.driver.fullName}
            {request.distanceKm != null && ` · ${request.distanceKm} กม.`}
          </p>
        </section>
      </main>
      <div className="flex flex-none flex-col gap-1 border-t border-slate-200 bg-white px-4 py-3">
        <Button onClick={() => navigate("/rating", { state: { request } })}>ให้คะแนนคนขับ</Button>
        <Button variant="ghost" onClick={() => navigate("/home")}>
          ไว้ทีหลัง
        </Button>
      </div>
    </div>
  );
}
