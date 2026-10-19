import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import MapView from "../../components/shared/MapView";
import Button from "../../components/ui/Button";
import ChatButton from "../../components/shared/ChatButton";
import RouteSummary from "../../components/shared/RouteSummary";
import SosPanel from "../../components/shared/SosPanel";
import TripHeader from "../../components/shared/TripHeader";
import { api } from "../../lib/api";
import { useDriverTracking } from "../../lib/useTripTracking";
import { useRoute } from "../../lib/useRoute";
import { gpsMessage } from "../../lib/gpsMessage";

// ระหว่างพาผู้โดยสารไปส่ง — เวลาที่จะถึงปลายทางเป็นเลขใหญ่ ปุ่ม "ถึงปลายทางแล้ว" อยู่ล่างสุดตำแหน่งเดิมทุกครั้ง
export default function DriverDuringRide() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sosOpen, setSosOpen] = useState(false);

  const { position: myPos, error: gpsError } = useDriverTracking(request?.id);
  const pickupPoint = request ? { lat: request.pickupLat, lng: request.pickupLng } : null;
  const destinationPoint = request ? { lat: request.destinationLat, lng: request.destinationLng } : null;
  const originPoint = myPos ?? pickupPoint;
  const route = useRoute(originPoint, destinationPoint, { precision: 3 });

  if (!request) return <Navigate to="/driver/home" replace />;
  const user = request.user;

  async function handleComplete() {
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post(`/service-requests/${request.id}/complete`);
      navigate("/driver/finish-ride", { state: { request: data } });
    } catch (err) {
      setError(err.response?.data?.message || "จบการเดินทางไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TripHeader
        status={`ไปส่ง ${request.destinationAddress ?? "ปลายทาง"}`}
        value={route?.durationMin}
        unit="นาที"
        fallback={gpsError ? gpsMessage(gpsError) : "กำลังเดินทาง"}
        onSos={() => setSosOpen(true)}
      >
        {route && (
          <p className="tabular mt-1 text-sm text-brand-100">
            อีก {route.distanceKm} กม. · ผู้โดยสาร {user.fullName.split(" ")[0]}
          </p>
        )}
      </TripHeader>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <MapView height="h-52" destination={destinationPoint} me={originPoint} hereLabel="คุณ" route={route?.coordinates} interactive />

        <section className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <RouteSummary pickup={request.pickupAddress ?? "จุดนัดพบ"} destination={request.destinationAddress ?? "-"} />
          <div className="tabular mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3">
            <span className="text-sm text-slate-600">{user.fullName}</span>
            <span className="text-2xl font-bold text-slate-900">{request.fare} ฿</span>
          </div>
        </section>

        <ChatButton request={request} label="แชตกับผู้โดยสาร" className="mt-4 w-full" />

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-here-soft px-3 py-2.5 text-center text-sm font-medium text-here">
            {error}
          </p>
        )}
      </main>

      <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
        <Button onClick={handleComplete} disabled={submitting}>
          {submitting ? "กำลังส่ง..." : "ถึงปลายทางแล้ว"}
        </Button>
      </div>

      <AnimatePresence>
        {sosOpen && (
          <SosPanel
            variant="sheet"
            onClose={() => setSosOpen(false)}
            tripContext={{ pickup: request.pickupAddress ?? "จุดนัดพบ", dropoff: request.destinationAddress ?? "-" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
