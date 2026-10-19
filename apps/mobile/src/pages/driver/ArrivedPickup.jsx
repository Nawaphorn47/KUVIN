import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { Phone } from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import ChatButton from "../../components/shared/ChatButton";
import RouteSummary from "../../components/shared/RouteSummary";
import { api } from "../../lib/api";
import { useDriverTracking } from "../../lib/useTripTracking";

// ถึงจุดรับ → ทักชื่อผู้โดยสารให้ตรงก่อนออกตัว แล้วกดเริ่มเดินทาง
export default function ArrivedPickup() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useDriverTracking(request?.id); // ส่งตำแหน่งสดต่อเนื่องระหว่างรอผู้โดยสารขึ้นรถ

  if (!request) return <Navigate to="/driver/home" replace />;
  const user = request.user;

  async function start() {
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post(`/service-requests/${request.id}/start`);
      navigate("/driver/during-ride", { state: { request: data } });
    } catch (err) {
      setError(err.response?.data?.message || "เริ่มการเดินทางไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <header className="flex-none bg-brand-600 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <p className="text-sm font-semibold text-brand-100">ถึงจุดรับแล้ว</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">รอ {user.fullName.split(" ")[0]} ขึ้นรถ</h1>
        <p className="mt-1 text-sm text-brand-100">ทักชื่อให้ตรงก่อนออกตัว จะได้ไม่รับผิดคน</p>
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <section aria-label="ผู้โดยสาร" className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <Avatar initial={user.fullName[0]} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-slate-900">{user.fullName}</p>
              <p className="truncate text-sm text-slate-600">รอที่ {request.pickupAddress ?? "จุดนัดพบ"}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {user.phone && (
              <a
                href={`tel:${user.phone}`}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-bold text-slate-800 active:bg-slate-200"
              >
                <Phone className="h-4 w-4" /> โทร
              </a>
            )}
            <ChatButton request={request} label="แชต" />
          </div>
        </section>

        <section className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <RouteSummary pickup={request.pickupAddress ?? "จุดนัดพบ"} destination={request.destinationAddress ?? "-"} />
          <p className="tabular mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3">
            <span className="text-sm text-slate-600">ค่าวิน</span>
            <span className="text-2xl font-bold text-slate-900">{request.fare} ฿</span>
          </p>
        </section>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
            {error}
          </p>
        )}
      </main>

      <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
        <Button onClick={start} disabled={submitting}>
          {submitting ? "กำลังเริ่ม..." : "ผู้โดยสารขึ้นรถแล้ว เริ่มเดินทาง"}
        </Button>
      </div>
    </div>
  );
}
