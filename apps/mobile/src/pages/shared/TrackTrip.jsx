import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bike, Loader2, Siren } from "lucide-react";
import MapView from "../../components/shared/MapView";
import RouteSummary from "../../components/shared/RouteSummary";
import StopNumber from "../../components/ui/StopNumber";
import { API_BASE_URL, fileUrl } from "../../lib/api";
import { DRIVER_TYPES } from "../../lib/driverTypes";

const POLL_MS = 5000;
const STATUS_TEXT = {
  PENDING: "กำลังหาคนขับ",
  ACCEPTED: "คนขับกำลังไปรับ",
  IN_PROGRESS: "กำลังเดินทาง",
  COMPLETED: "ถึงปลายทางแล้ว",
  CANCELLED: "ทริปนี้ถูกยกเลิก",
};
const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "");

// หน้าสาธารณะของลิงก์แชร์ทริป — คนที่ได้รับลิงก์ (เพื่อน/ครอบครัว) เปิดได้โดยไม่ต้องลงแอปหรือล็อกอิน
// เห็นแค่ชื่อเล่น รถคันไหน และตำแหน่งสดระหว่างทริป ไม่มีเบอร์โทร
export default function TrackTrip() {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let timer;
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/public/trip-share/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setError(data.error || "ลิงก์นี้หมดอายุหรือไม่ถูกต้อง");
          return;
        }
        setTrip(data);
        setError("");
        if (data.active) timer = setTimeout(load, POLL_MS);
      } catch {
        if (alive) timer = setTimeout(load, POLL_MS * 2); // เน็ตหลุด ลองใหม่ช้าลง
      }
    }
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [token]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50 px-8 text-center">
        <Bike className="h-10 w-10 text-slate-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900">เปิดลิงก์ไม่ได้</h1>
        <p className="text-[15px] text-slate-600">{error}</p>
      </div>
    );
  }
  if (!trip) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="กำลังโหลด" />
      </div>
    );
  }

  const d = trip.driver;
  const pickup = trip.pickup.lat != null ? { lat: trip.pickup.lat, lng: trip.pickup.lng } : null;
  const destination = trip.destination.lat != null ? { lat: trip.destination.lat, lng: trip.destination.lng } : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <header className="flex-none bg-brand-600 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <p className="text-sm font-semibold text-brand-100">
          ติดตามทริปของ{trip.passengerFirstName ? ` ${trip.passengerFirstName}` : "เพื่อนคุณ"}
          {trip.area ? ` · ${trip.area}` : ""}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight" aria-live="polite">
          {STATUS_TEXT[trip.status] ?? trip.status}
        </h1>
        {trip.active && d?.location && <p className="tabular mt-1 text-sm text-brand-100">ตำแหน่งล่าสุด {clock(d.location.at)}</p>}
      </header>
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <MapView
          height="h-64"
          pickup={pickup}
          destination={destination}
          driver={d?.location ? { lat: d.location.lat, lng: d.location.lng } : null}
          interactive
        />
        {!trip.active && (
          <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            ทริปจบแล้ว ลิงก์นี้ไม่แสดงตำแหน่งคนขับอีก
          </p>
        )}

        {d && (
          <section aria-label="คนขับ" className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              {d.photoUrl ? (
                <img src={fileUrl(d.photoUrl)} alt={`คนขับ ${d.firstName}`} className="h-14 w-14 flex-none rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
                  {d.firstName?.[0]}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate text-lg font-bold text-slate-900">{d.firstName}</span>
                  {DRIVER_TYPES[d.driverType] && (
                    <span className="flex-none rounded-md bg-brand-100 px-1.5 py-0.5 text-xs font-bold text-brand-800">
                      {DRIVER_TYPES[d.driverType].label}
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-slate-600">{d.vehicleModel ?? "รถจักรยานยนต์"}</p>
              </div>
              {d.vinNumber && <StopNumber n={d.vinNumber} selected size="lg" />}
            </div>
            <p className="tabular mt-3 inline-block rounded-md border-2 border-slate-900 bg-white px-3 py-1 text-lg font-bold tracking-wide text-slate-900">
              {d.licensePlate}
            </p>
          </section>
        )}

        <section className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <RouteSummary pickup={trip.pickup.address ?? "จุดรับ"} destination={trip.destination.address ?? "ปลายทาง"} />
        </section>

        <p className="mt-4 flex items-start gap-2 text-sm text-slate-600">
          <Siren className="mt-0.5 h-4 w-4 flex-none text-here" aria-hidden="true" />
          ถ้าคิดว่าเพื่อนไม่ปลอดภัย โทร 191 (ตำรวจ) หรือ 1669 (การแพทย์ฉุกเฉิน) ได้ทันที
        </p>
      </main>
    </div>
  );
}
