import { useEffect, useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { Check, Flag } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../../components/ui/Button";
import PaymentQr from "../../components/shared/PaymentQr";
import TripHeader from "../../components/shared/TripHeader";
import { api } from "../../lib/api";

// จบทริป: ค่าวินเป็นเลขใหญ่หัวจอ → เก็บเงิน (QR พร้อมเพย์ให้ผู้โดยสารสแกน หรือกดยืนยันรับเงินสด) → รับงานต่อ
export default function FinishRide() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [paymentStatus, setPaymentStatus] = useState(request?.paymentStatus ?? "PENDING");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [paidBy, setPaidBy] = useState(request?.paymentConfirmedBy ?? null);
  const [slipEnabled, setSlipEnabled] = useState(false);

  // ผู้โดยสารโอนแล้วแนบสลิป ระบบตรวจผ่านจะเปลี่ยนเป็นจ่ายแล้วเอง — เช็คสถานะเป็นระยะให้หน้านี้อัปเดตตาม
  useEffect(() => {
    if (!request?.id || paymentStatus === "PAID") return undefined;
    const t = setInterval(() => {
      api
        .get(`/service-requests/${request.id}`)
        .then(({ data }) => {
          if (data.paymentStatus === "PAID") {
            setPaidBy(data.paymentConfirmedBy);
            setPaymentStatus("PAID");
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [request?.id, paymentStatus]);

  if (!request) return <Navigate to="/driver/home" replace />;

  async function confirmPaid() {
    setConfirming(true);
    setError("");
    try {
      await api.post(`/service-requests/${request.id}/payment`, { status: "PAID" });
      setPaymentStatus("PAID");
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setConfirming(false);
    }
  }

  const paid = paymentStatus === "PAID";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TripHeader status={`ส่งถึง ${request.destinationAddress ?? "ปลายทาง"} แล้ว · ค่าวิน`} value={request.fare} unit="฿">
        {request.distanceKm != null && <p className="tabular mt-1 text-sm text-brand-100">{request.distanceKm} กม.</p>}
      </TripHeader>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {paid ? (
          <motion.p
            role="status"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="flex items-center gap-3 rounded-xl bg-brand-50 p-4 text-base font-bold text-brand-800 ring-1 ring-brand-200"
          >
            <span className="flex h-9 w-9 flex-none -rotate-6 items-center justify-center rounded-full bg-brand-600 text-white shadow-sticker">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <span>
              ได้รับเงิน {request.fare} บาทแล้ว
              {paidBy === "SLIP" && <span className="block text-sm font-normal text-slate-600">ผู้โดยสารโอนแล้ว ตรวจสลิปกับธนาคารเรียบร้อย</span>}
            </span>
          </motion.p>
        ) : (
          <section aria-labelledby="collect-title" className="flex flex-col gap-3">
            <h2 id="collect-title" className="text-base font-bold text-slate-900">
              เก็บเงิน
            </h2>
            <PaymentQr requestId={request.id} onLoaded={(qr) => setSlipEnabled(Boolean(qr.slipVerification))} />
            {slipEnabled && (
              <p className="text-sm text-slate-600">ผู้โดยสารโอนแล้วแนบสลิป ระบบจะตรวจและยืนยันให้เอง ถ้าจ่ายเงินสดให้กดยืนยันด้านล่าง</p>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
                {error}
              </p>
            )}
            <Button variant="outline" onClick={confirmPaid} disabled={confirming}>
              {confirming ? "กำลังบันทึก..." : "ยืนยันได้รับเงินสดแล้ว"}
            </Button>
          </section>
        )}

        <button
          type="button"
          onClick={() => navigate("/report-trip", { state: { request } })}
          className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 text-sm font-bold text-slate-600"
        >
          <Flag className="h-4 w-4" aria-hidden="true" /> มีปัญหากับผู้โดยสาร? แจ้งแอดมิน
        </button>
      </main>

      <div className="flex flex-none flex-col gap-1 border-t border-slate-200 bg-white px-4 py-3">
        <Button onClick={() => navigate("/driver/home")}>รับงานต่อ</Button>
        <Button variant="ghost" onClick={() => navigate("/driver/earnings")}>
          ดูรายได้วันนี้
        </Button>
      </div>
    </div>
  );
}
