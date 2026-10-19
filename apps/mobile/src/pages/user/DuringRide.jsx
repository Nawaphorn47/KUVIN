import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import MapView from "../../components/shared/MapView";
import SosPanel from "../../components/shared/SosPanel";
import TripHeader from "../../components/shared/TripHeader";
import TripRail from "../../components/shared/TripRail";
import Avatar from "../../components/ui/Avatar";
import { useRequestStatus } from "../../lib/useRequestStatus";
import { useDriverLocation } from "../../lib/useTripTracking";
import { useRoute } from "../../lib/useRoute";

export default function DuringRide() {
  const navigate = useNavigate();
  const location = useLocation();
  const [request, setRequest] = useState(location.state?.request ?? null);
  const [sosOpen, setSosOpen] = useState(false);

  const pickupPoint = request?.pickupLat != null ? { lat: request.pickupLat, lng: request.pickupLng } : null;
  const destinationPoint = request?.destinationLat != null ? { lat: request.destinationLat, lng: request.destinationLng } : null;
  const driverPos = useDriverLocation(request?.id, request?.driver);
  // เส้นทางเหลือถึงปลายทางนับจากตำแหน่งคนขับตอนนี้ (ยังไม่มีตำแหน่งสดก็วาดจากจุดรับ)
  const originPoint = driverPos ?? pickupPoint;
  const route = useRoute(originPoint, destinationPoint, { precision: 3 });

  const done = useRef(false);

  // สถานะใหม่มาทาง socket + ดึงซ้ำตอนต่อ socket ใหม่/ทุก 5 วิ (ดู useRequestStatus) — กันค้างหน้านี้หลังจบทริปแล้ว
  useRequestStatus(request?.id, (updated) => {
    setRequest(updated);
    if (done.current) return;
    if (updated.status === "COMPLETED") {
      done.current = true;
      navigate("/ride-completed", { state: { request: updated } });
    }
  });

  useEffect(() => {
    if (!request?.id) navigate("/home");
  }, [request?.id, navigate]);

  if (!request) return null;
  const driver = request.driver;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TripHeader
        status={`กำลังไป ${request.destinationAddress ?? "ปลายทาง"}`}
        value={route?.durationMin}
        unit="นาทีถึง"
        fallback="กำลังเดินทาง"
        onSos={() => setSosOpen(true)}
      />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <MapView
          height="h-52"
          destination={destinationPoint}
          driver={driverPos}
          route={route?.coordinates}
          fit={[
            destinationPoint && [destinationPoint.lat, destinationPoint.lng],
            originPoint && [originPoint.lat, originPoint.lng],
          ]}
          interactive
        />

        <section className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <TripRail
            stage={2}
            request={request}
            now={route ? `เหลืออีก ${route.distanceKm} กม.` : null}
          />
        </section>

        <section aria-label="คนขับและค่าวิน" className="mt-4 flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <Avatar initial={driver.fullName[0]} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-slate-900">{driver.fullName}</p>
            <p className="tabular text-sm text-slate-600">{driver.licensePlate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">จ่ายตอนถึง</p>
            <p className="tabular text-2xl font-bold text-slate-900">{request.fare} ฿</p>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {sosOpen && (
          <SosPanel
            variant="sheet"
            onClose={() => setSosOpen(false)}
            tripContext={{
              pickup: request.pickupAddress ?? "จุดนัดพบ",
              dropoff: request.destinationAddress ?? "-",
              driverName: driver.fullName,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
