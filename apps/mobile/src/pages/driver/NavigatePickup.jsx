import { useNavigate, useLocation } from "react-router-dom";
import { Phone, Navigation } from "lucide-react";
import MapView from "../../components/shared/MapView";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import { useDriverTracking } from "../../lib/useTripTracking";
import { useRoute } from "../../lib/useRoute";
import { gpsMessage } from "../../lib/gpsMessage";

export default function NavigatePickup() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;

  // GPS ของคนขับ (ส่งให้ผู้โดยสารเห็นสดด้วย) + เส้นทางถนนจริงไปจุดรับ
  const { position: myPos, error: gpsError } = useDriverTracking(request?.id);
  const pickupPoint = request ? { lat: request.pickupLat, lng: request.pickupLng } : null;
  const route = useRoute(myPos, pickupPoint, { precision: 3 });

  if (!request) {
    navigate("/driver/home");
    return null;
  }
  const user = request.user;

  return (
    <div className="flex flex-1 flex-col">
      <MapView height="h-72" className="rounded-none" pickup={pickupPoint} me={myPos} route={route?.coordinates} interactive>
        <div className="absolute left-0 right-0 top-0 p-4">
          <div className="rounded-xl bg-white/95 p-3 shadow backdrop-blur">
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Navigation className="h-3.5 w-3.5" /> นำทางไปรับผู้โดยสาร
            </p>
            <p className="text-base font-bold text-slate-900">{request.pickupAddress ?? "จุดนัดพบ"}</p>
            <p className="text-xs text-slate-500">
              {route
                ? `อีกประมาณ ${route.durationMin} นาที · ${route.distanceKm} กม.`
                : gpsError
                  ? gpsMessage(gpsError)
                  : "กำลังหาตำแหน่งของคุณ..."}
            </p>
          </div>
        </div>
      </MapView>

      <div className="flex flex-1 flex-col gap-4 rounded-t-3xl bg-white p-5 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <Avatar initial={user.fullName[0]} size="lg" />
          <div>
            <p className="text-xl font-bold text-slate-900">{user.fullName}</p>
            <a href={`tel:${user.phone}`} className="flex items-center gap-1 text-sm text-slate-500">
              <Phone className="h-3.5 w-3.5" /> {user.phone}
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs text-slate-400">ส่งที่</p>
            <p className="text-base font-bold text-slate-900">{request.destinationAddress ?? "-"}</p>
          </div>
          <p className="text-xl font-bold text-emerald-600">{request.fare} ฿</p>
        </div>

        <Button onClick={() => navigate("/driver/arrived-pickup", { state: { request } })}>
          ถึงจุดรับแล้ว
        </Button>
      </div>
    </div>
  );
}
