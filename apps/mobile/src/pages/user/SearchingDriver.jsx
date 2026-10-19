import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SearchX } from "lucide-react";
import Button from "../../components/ui/Button";
import MapView from "../../components/shared/MapView";
import TripHeader from "../../components/shared/TripHeader";
import TripRail from "../../components/shared/TripRail";
import { api } from "../../lib/api";
import { useRequestStatus } from "../../lib/useRequestStatus";

export default function SearchingDriver() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  const done = useRef(false);

  function react(updated) {
    if (done.current) return;
    if (updated.status === "ACCEPTED") {
      done.current = true;
      navigate("/driver-arriving", { state: { request: updated } });
    } else if (updated.status === "CANCELLED") {
      done.current = true;
      setError(updated.cancelReason || "ไม่พบคนขับว่างในขณะนี้");
    }
  }

  // สถานะใหม่มาทาง socket + ดึงซ้ำตอนต่อ socket ใหม่/ทุก 5 วิ (ดู useRequestStatus) — ครอบกรณี backend ยกเลิกคำขอ
  // ทันทีตอนสร้างเพราะไม่มีคนขับว่างเลย และกรณี socket หลุดตอนคนขับกดรับงานพอดี
  useRequestStatus(request?.id, react);

  useEffect(() => {
    if (!request?.id) {
      navigate("/home");
      return undefined;
    }
    react(request); // คำขอที่ส่งมากับ navigation อาจถูกยกเลิกไปแล้วตั้งแต่ตอนสร้าง — ไม่ต้องรอ request แรกกลับมา
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  async function handleCancel() {
    if (request?.id) {
      try {
        await api.post(`/service-requests/${request.id}/cancel`);
      } catch {
        // ยกเลิกไม่สำเร็จก็ไม่เป็นไร กลับหน้าหลักได้เลย
      }
    }
    navigate("/home");
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col bg-slate-50">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-here-soft text-here">
            <SearchX className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">ตอนนี้ยังไม่มีวินว่าง</h1>
            <p className="mt-2 text-base text-slate-600">{error}</p>
            <p className="mt-1 text-sm text-slate-500">ยังไม่มีการเก็บเงิน ลองเรียกใหม่อีกครั้งในอีกสักครู่</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <Button onClick={() => navigate("/confirm-booking")}>เรียกอีกครั้ง</Button>
          <Button variant="ghost" onClick={() => navigate("/home")}>
            กลับหน้าแรก
          </Button>
        </div>
      </div>
    );
  }

  const pickupPoint = request?.pickupLat != null ? { lat: request.pickupLat, lng: request.pickupLng } : null;
  const destinationPoint =
    request?.destinationLat != null ? { lat: request.destinationLat, lng: request.destinationLng } : null;
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TripHeader status="กำลังหาวินให้คุณ" value={`${mm}:${ss}`}>
        <p className="mt-1 text-sm text-brand-100">ระบบเสนองานให้คนขับในคิวทีละคน ไม่ต้องกดอะไรเพิ่ม</p>
      </TripHeader>
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {pickupPoint && <MapView height="h-44" pickup={pickupPoint} destination={destinationPoint} />}
        <section className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <TripRail stage={0} request={request} now="รอคนขับคนแรกในคิวกดรับงาน" />
        </section>
      </main>
      <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
        <Button variant="outline" onClick={handleCancel}>
          ยกเลิกการเรียก
        </Button>
      </div>
    </div>
  );
}
