import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Phone } from "lucide-react";
import MapView from "../../components/shared/MapView";
import DriverInfoCard from "../../components/shared/DriverInfoCard";
import SosPanel from "../../components/shared/SosPanel";
import TripHeader from "../../components/shared/TripHeader";
import TripRail from "../../components/shared/TripRail";
import ChatButton from "../../components/shared/ChatButton";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useRequestStatus } from "../../lib/useRequestStatus";
import { useDriverLocation } from "../../lib/useTripTracking";
import { useRoute } from "../../lib/useRoute";

export default function DriverArriving() {
  const navigate = useNavigate();
  const location = useLocation();
  const [request, setRequest] = useState(location.state?.request ?? null);
  const [sosOpen, setSosOpen] = useState(false);

  // ตำแหน่งสดของคนขับ (socket) + เส้นทางถนนจริงจากคนขับมาจุดรับ — ไม่มีตำแหน่งคนขับก็ยังเห็นจุดรับ
  const pickupPoint = request?.pickupLat != null ? { lat: request.pickupLat, lng: request.pickupLng } : null;
  const driverPos = useDriverLocation(request?.id, request?.driver);
  const route = useRoute(driverPos, pickupPoint, { precision: 3 });

  const done = useRef(false);

  // สถานะใหม่มาทาง socket + ดึงซ้ำตอนต่อ socket ใหม่/ทุก 5 วิ (ดู useRequestStatus) — กันพลาดตอนคนขับกดเริ่มเดินทาง
  // ในช่วงที่ socket หลุดพอดี (เดิมจะค้างหน้านี้ไปตลอดทั้งที่ทริปเริ่มแล้ว)
  useRequestStatus(request?.id, (updated) => {
    setRequest(updated);
    if (done.current) return;
    if (updated.status === "IN_PROGRESS") {
      done.current = true;
      navigate("/during-ride", { state: { request: updated } });
    } else if (updated.status === "CANCELLED") {
      done.current = true;
      navigate("/home");
    }
  });

  useEffect(() => {
    if (!request?.id) navigate("/home");
  }, [request?.id, navigate]);

  async function handleCancel() {
    try {
      await api.post(`/service-requests/${request.id}/cancel`);
    } catch {
      // ปล่อยผ่าน — กลับหน้าหลักได้แม้ยกเลิกไม่สำเร็จ (เช่น คนขับเริ่มทริปไปแล้วพอดี)
    }
    navigate("/home");
  }

  if (!request) return null;
  const driver = request.driver;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TripHeader
        status="คนขับกำลังมารับ"
        value={route?.durationMin}
        unit="นาที"
        fallback="รอตำแหน่งคนขับ..."
        onSos={() => setSosOpen(true)}
      />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <MapView height="h-52" pickup={pickupPoint} driver={driverPos} route={route?.coordinates} interactive />

        <section aria-label="คนขับของคุณ" className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <DriverInfoCard driver={driver} />
          <p className="mt-3 text-sm text-slate-600">ดูเลขเสื้อกับป้ายทะเบียนให้ตรงก่อนขึ้นรถ</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={`tel:${driver.phone}`}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-bold text-slate-800 active:bg-slate-200"
            >
              <Phone className="h-4 w-4" /> โทรหาคนขับ
            </a>
            <ChatButton request={request} label="แชตกับคนขับ" />
          </div>
        </section>

        <section className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <TripRail
            stage={1}
            request={request}
            now={route ? `อยู่ห่างจุดรับ ${route.distanceKm} กม. · คนขับกดเริ่มเมื่อคุณขึ้นรถแล้ว` : "คนขับกดเริ่มเมื่อคุณขึ้นรถแล้ว"}
          />
        </section>
      </main>
      <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
        <Button variant="outline" onClick={handleCancel}>
          ยกเลิกการเรียก
        </Button>
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
