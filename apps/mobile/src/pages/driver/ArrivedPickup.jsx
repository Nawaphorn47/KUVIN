import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Phone, MapPinCheck } from "lucide-react";
import { motion } from "framer-motion";
import Avatar from "../../components/ui/Avatar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import RouteSummary from "../../components/shared/RouteSummary";
import { api } from "../../lib/api";
import { useDriverTracking } from "../../lib/useTripTracking";

export default function ArrivedPickup() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useDriverTracking(request?.id); // ส่งตำแหน่งสดต่อเนื่องระหว่างรอผู้โดยสารขึ้นรถ

  if (!request) {
    navigate("/driver/home");
    return null;
  }
  const user = request.user;

  async function handleStart() {
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post(`/service-requests/${request.id}/start`);
      navigate("/driver/during-ride", { state: { request: data } });
    } catch (err) {
      setError(err.response?.data?.message || "เริ่มการเดินทางไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-white px-6 pb-8 pt-10 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
      >
        <MapPinCheck className="h-8 w-8" />
      </motion.div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">ถึงจุดรับแล้ว!</h1>
        <p className="mt-1 text-base text-slate-500">กำลังรอผู้โดยสาร</p>
      </div>

      <Card className="w-full gap-4">
        <div className="flex items-center gap-3">
          <Avatar initial={user.fullName[0]} size="lg" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{user.fullName}</p>
            <p className="text-base text-slate-500">{user.phone}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 text-left">
          <RouteSummary pickup={request.pickupAddress ?? "จุดนัดพบ"} destination={request.destinationAddress ?? "-"} />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">ค่าบริการ</span>
          <span className="text-2xl font-bold text-emerald-600">{request.fare} ฿</span>
        </div>
      </Card>

      <a href={`tel:${user.phone}`} className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <Phone className="h-5 w-5" /> โทรหาผู้โดยสาร
      </a>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleStart} disabled={submitting}>
        {submitting ? "กำลังเริ่ม..." : "เริ่มการเดินทาง"}
      </Button>
    </div>
  );
}
