import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../../components/ui/Button";
import PaymentQr from "../../components/shared/PaymentQr";

export default function RideCompleted() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;

  if (!request) {
    navigate("/home");
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-gradient-to-b from-emerald-600 to-emerald-800 px-8 text-center text-white">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
      >
        <CheckCircle2 className="h-20 w-20" strokeWidth={1.5} />
      </motion.div>

      <div>
        <h1 className="text-3xl font-bold">เดินทางเสร็จสิ้น!</h1>
        <p className="mt-1 text-base text-emerald-100">{request.destinationAddress ?? "-"}</p>
      </div>

      <div className="w-full rounded-2xl bg-white/10 p-5 backdrop-blur">
        <p className="text-sm text-emerald-100">ค่าบริการทั้งหมด</p>
        <p className="text-4xl font-bold">{request.fare} ฿</p>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-4 text-left">
          <div>
            <p className="text-xs text-emerald-100">คนขับ</p>
            <p className="text-sm font-semibold">{request.driver.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-100">ระยะทาง</p>
            <p className="text-sm font-semibold">{request.distanceKm} กม.</p>
          </div>
        </div>
      </div>

      {request.paymentStatus !== "PAID" && <PaymentQr requestId={request.id} />}

      <Button variant="secondary" onClick={() => navigate("/rating", { state: { request } })}>
        ให้คะแนนคนขับ
      </Button>
      <button onClick={() => navigate("/home")} className="text-sm text-emerald-100">
        ข้ามไปก่อน
      </button>
    </div>
  );
}
