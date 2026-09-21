import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PartyPopper, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../../components/ui/Button";
import PaymentQr from "../../components/shared/PaymentQr";
import { api } from "../../lib/api";

export default function FinishRide() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [paymentStatus, setPaymentStatus] = useState(request?.paymentStatus ?? "PENDING");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  if (!request) {
    navigate("/driver/home");
    return null;
  }

  async function confirmPaid() {
    setConfirming(true);
    setError("");
    try {
      await api.post(`/service-requests/${request.id}/payment`, { status: "PAID" });
      setPaymentStatus("PAID");
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-5 bg-gradient-to-b from-emerald-600 to-emerald-800 px-8 pb-8 pt-10 text-center text-white">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <PartyPopper className="h-14 w-14" />
      </motion.div>

      <div>
        <h1 className="text-3xl font-bold">ส่งเสร็จแล้ว!</h1>
        <p className="mt-1 text-sm text-emerald-100">{request.destinationAddress ?? "-"}</p>
      </div>

      {paymentStatus === "PAID" ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 px-6 py-8">
          <CheckCircle2 className="h-10 w-10" />
          <p className="text-lg font-bold">ได้รับเงิน {request.fare} บาทแล้ว</p>
        </div>
      ) : (
        <>
          <PaymentQr requestId={request.id} />
          {error && <p className="text-sm text-red-200">{error}</p>}
          <Button variant="secondary" onClick={confirmPaid} disabled={confirming}>
            {confirming ? "กำลังบันทึก..." : "ยืนยันได้รับเงินแล้ว"}
          </Button>
        </>
      )}

      <div className="grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-lg font-bold">{request.distanceKm} กม.</p>
          <p className="text-xs text-emerald-200">ระยะทาง</p>
        </div>
        <div>
          <p className="text-lg font-bold">{request.fare} ฿</p>
          <p className="text-xs text-emerald-200">ค่าโดยสาร</p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button onClick={() => navigate("/driver/home")}>รับงานต่อ</Button>
        <Button variant="secondary" onClick={() => navigate("/driver/earnings")}>
          ดูรายได้วันนี้
        </Button>
      </div>
    </div>
  );
}
