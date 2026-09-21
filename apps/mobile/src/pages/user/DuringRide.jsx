import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import MapView from "../../components/shared/MapView";
import RouteSummary from "../../components/shared/RouteSummary";
import SosPanel from "../../components/shared/SosPanel";
import Card from "../../components/ui/Card";
import Avatar from "../../components/ui/Avatar";
import { socket, connectWithAuth } from "../../lib/socket";
import { api } from "../../lib/api";
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

  useEffect(() => {
    if (!request?.id) {
      navigate("/home");
      return;
    }

    let done = false;
    function react(updated) {
      setRequest(updated);
      if (done) return;
      if (updated.status === "COMPLETED") {
        done = true;
        navigate("/ride-completed", { state: { request: updated } });
      }
    }

    connectWithAuth();
    socket.emit("service-request:watch", request.id);

    function handleStatus(updated) {
      if (updated.id !== request.id) return;
      react(updated);
    }
    socket.on("service-request:status", handleStatus);

    // เช็คสถานะจริงทันทีตอน mount — กันพลาด event ที่อาจเกิดขึ้นไปแล้วก่อน join room ทัน
    api
      .get(`/service-requests/${request.id}`)
      .then(({ data }) => react(data))
      .catch(() => {});
    return () => socket.off("service-request:status", handleStatus);
  }, [request?.id, navigate]);

  if (!request) return null;
  const driver = request.driver;

  return (
    <div className="flex flex-1 flex-col">
      <MapView
        height="h-72"
        className="rounded-none"
        destination={destinationPoint}
        driver={driverPos}
        route={route?.coordinates}
        fit={[
          destinationPoint && [destinationPoint.lat, destinationPoint.lng],
          originPoint && [originPoint.lat, originPoint.lng],
        ]}
        interactive
      >
        <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-4">
          <div className="rounded-xl bg-white/95 px-3 py-2 shadow backdrop-blur">
            <p className="text-xs font-semibold text-slate-900">กำลังเดินทาง</p>
            {route && (
              <p className="text-xs text-slate-500">
                อีกประมาณ {route.durationMin} นาที · {route.distanceKm} กม.
              </p>
            )}
          </div>
          <button
            onClick={() => setSosOpen(true)}
            className="flex flex-col items-center gap-0.5 rounded-full bg-red-500 px-3 py-2 text-white shadow"
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="text-[8px] font-bold">SOS ฉุกเฉิน</span>
          </button>
        </div>
      </MapView>

      <div className="flex flex-1 flex-col gap-4 rounded-t-3xl bg-white p-5 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-emerald-600">กำลังเดินทาง</p>
          <p className="text-xs text-slate-400">รอคนขับกดถึงปลายทาง</p>
        </div>

        <Card className="flex items-center gap-3 shadow-none ring-slate-100">
          <Avatar initial={driver.fullName[0]} />
          <div>
            <p className="text-sm font-bold text-slate-900">{driver.fullName}</p>
            <p className="text-xs text-slate-400">{driver.licensePlate}</p>
          </div>
        </Card>

        <Card className="shadow-none ring-slate-100">
          <p className="mb-2 text-xs text-slate-400">เส้นทาง</p>
          <RouteSummary
            pickup={request.pickupAddress ?? "จุดนัดพบ"}
            destination={request.destinationAddress ?? "-"}
          />
        </Card>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-500">ค่าบริการ</span>
          <span className="text-xl font-bold text-emerald-600">{request.fare} ฿</span>
        </div>
      </div>

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
