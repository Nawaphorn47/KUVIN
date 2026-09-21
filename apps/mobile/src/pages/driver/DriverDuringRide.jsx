import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navigation } from "lucide-react";
import MapView from "../../components/shared/MapView";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useDriverTracking } from "../../lib/useTripTracking";
import { useRoute } from "../../lib/useRoute";
import { gpsMessage } from "../../lib/gpsMessage";

export default function DriverDuringRide() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { position: myPos, error: gpsError } = useDriverTracking(request?.id);
  const pickupPoint = request ? { lat: request.pickupLat, lng: request.pickupLng } : null;
  const destinationPoint = request ? { lat: request.destinationLat, lng: request.destinationLng } : null;
  const originPoint = myPos ?? pickupPoint;
  const route = useRoute(originPoint, destinationPoint, { precision: 3 });

  if (!request) {
    navigate("/driver/home");
    return null;
  }
  const user = request.user;

  async function handleComplete() {
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post(`/service-requests/${request.id}/complete`);
      navigate("/driver/finish-ride", { state: { request: data } });
    } catch (err) {
      setError(err.response?.data?.message || "จบการเดินทางไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <MapView height="h-72" className="rounded-none" destination={destinationPoint} me={originPoint} route={route?.coordinates} interactive>
        <div className="absolute left-0 right-0 top-0 p-4">
          <div className="rounded-xl bg-white/95 p-3 shadow backdrop-blur">
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Navigation className="h-3.5 w-3.5" /> นำทางไปส่งผู้โดยสาร
            </p>
            <p className="text-base font-bold text-slate-900">{request.destinationAddress ?? "-"}</p>
            <p className="text-xs text-slate-500">
              {route ? `อีกประมาณ ${route.durationMin} นาที · ${route.distanceKm} กม.` : gpsError ? gpsMessage(gpsError) : ""}
            </p>
          </div>
        </div>
      </MapView>

      <div className="flex flex-1 flex-col gap-4 rounded-t-3xl bg-white p-5 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{request.pickupAddress ?? "จุดนัดพบ"}</span>
          <span>{request.destinationAddress ?? "-"}</span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-2xl bg-slate-50 py-3 text-center">
          <div>
            <p className="text-xs text-slate-400">ผู้โดยสาร</p>
            <p className="text-base font-bold text-slate-900">{user.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">ระยะทาง</p>
            <p className="text-base font-bold text-slate-900">{request.distanceKm} กม.</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">ค่าบริการ</p>
            <p className="text-xl font-bold text-emerald-600">{request.fare} ฿</p>
          </div>
        </div>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        <Button onClick={handleComplete} disabled={submitting}>
          {submitting ? "กำลังส่ง..." : "ถึงปลายทางแล้ว"}
        </Button>
      </div>
    </div>
  );
}
