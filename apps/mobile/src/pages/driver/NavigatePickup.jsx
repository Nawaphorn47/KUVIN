import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Phone } from "lucide-react";
import MapView from "../../components/shared/MapView";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import ChatButton from "../../components/shared/ChatButton";
import RouteSummary from "../../components/shared/RouteSummary";
import SosPanel from "../../components/shared/SosPanel";
import TripHeader from "../../components/shared/TripHeader";
import { useDriverTracking } from "../../lib/useTripTracking";
import { useRoute } from "../../lib/useRoute";
import { gpsMessage } from "../../lib/gpsMessage";

// ไปรับผู้โดยสาร — เวลาที่จะถึงเป็นเลขใหญ่หัวจอ (หน้าเดียวกับทริปฝั่งผู้โดยสาร: หัวป้ายสีแบรนด์ + แผนที่ + ปุ่มหลักด้านล่าง)
export default function NavigatePickup() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [sosOpen, setSosOpen] = useState(false);

  // GPS ของคนขับ (ส่งให้ผู้โดยสารเห็นสดด้วย) + เส้นทางถนนจริงไปจุดรับ
  const { position: myPos, error: gpsError } = useDriverTracking(request?.id);
  const pickupPoint = request ? { lat: request.pickupLat, lng: request.pickupLng } : null;
  const route = useRoute(myPos, pickupPoint, { precision: 3 });

  if (!request) return <Navigate to="/driver/home" replace />;
  const user = request.user;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TripHeader
        status={`ไปรับ ${user.fullName.split(" ")[0]}`}
        value={route?.durationMin}
        unit="นาที"
        fallback={gpsError ? gpsMessage(gpsError) : "กำลังหาตำแหน่งของคุณ..."}
        onSos={() => setSosOpen(true)}
      >
        {route && (
          <p className="tabular mt-1 text-sm text-brand-100">
            อีก {route.distanceKm} กม. · {request.pickupAddress ?? "จุดนัดพบ"}
          </p>
        )}
      </TripHeader>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <MapView height="h-52" pickup={pickupPoint} me={myPos} hereLabel="คุณ" route={route?.coordinates} interactive />

        <section aria-label="ผู้โดยสาร" className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatarUrl} initial={user.fullName[0]} size="lg" />
            <p className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{user.fullName}</p>
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
      </main>

      <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
        <Button onClick={() => navigate("/driver/arrived-pickup", { state: { request } })}>ถึงจุดรับแล้ว</Button>
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
