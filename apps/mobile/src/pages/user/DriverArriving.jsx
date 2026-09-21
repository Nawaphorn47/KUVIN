import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ShieldAlert, Phone, MessageCircle } from "lucide-react";
import MapView from "../../components/shared/MapView";
import DriverInfoCard from "../../components/shared/DriverInfoCard";
import SosPanel from "../../components/shared/SosPanel";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";
import { socket, connectWithAuth } from "../../lib/socket";
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

  useEffect(() => {
    if (!request?.id) {
      navigate("/home");
      return;
    }

    let done = false;
    function react(updated) {
      setRequest(updated);
      if (done) return;
      if (updated.status === "IN_PROGRESS") {
        done = true;
        navigate("/during-ride", { state: { request: updated } });
      } else if (updated.status === "CANCELLED") {
        done = true;
        navigate("/home");
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
    // (เช่น คนขับกดเริ่มเดินทางเร็วมากพอดีตอนหน้านี้กำลังเชื่อม socket)
    api
      .get(`/service-requests/${request.id}`)
      .then(({ data }) => react(data))
      .catch(() => {});

    return () => socket.off("service-request:status", handleStatus);
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
    <div className="flex flex-1 flex-col">
      <MapView
        height="h-72"
        className="rounded-none"
        pickup={pickupPoint}
        driver={driverPos}
        route={route?.coordinates}
        interactive
      >
        <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-4">
          <div className="rounded-xl bg-white/95 px-3 py-2 shadow backdrop-blur">
            <p className="text-xs font-semibold text-slate-900">คนขับกำลังมารับคุณ</p>
            <p className="text-xs text-slate-500">
              {route ? `ถึงใน ประมาณ ${route.durationMin} นาที · ${route.distanceKm} กม.` : "กำลังรอตำแหน่งคนขับ..."}
            </p>
          </div>
          <button
            onClick={() => setSosOpen(true)}
            className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> SOS
          </button>
        </div>
      </MapView>

      <div className="flex flex-1 flex-col gap-4 rounded-t-3xl bg-white p-5 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <Card className="gap-2 shadow-none ring-emerald-100">
          <p className="text-sm font-semibold text-emerald-600">คนขับกำลังเดินทางมา</p>
          <DriverInfoCard driver={driver} />
        </Card>

        <div className="flex gap-3">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
            <span>{driver.licensePlate}</span>
          </button>
          <a
            href={`tel:${driver.phone}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
          >
            <Phone className="h-5 w-5" />
          </a>
          <button
            onClick={() => navigate("/chatbot")}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>

        <Card className="gap-3 shadow-none ring-slate-100">
          <div>
            <p className="text-xs text-slate-400">รับที่</p>
            <p className="text-sm text-slate-700">{request.pickupAddress ?? "จุดนัดพบ"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">ส่งที่</p>
            <p className="text-sm text-slate-700">{request.destinationAddress ?? "-"}</p>
          </div>
        </Card>

        <Button variant="danger" onClick={handleCancel}>
          ยกเลิกการเรียกวิน
        </Button>

        <p className="text-center text-xs text-slate-400">รอคนขับกดเริ่มการเดินทางเมื่อถึงจุดรับ</p>
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
