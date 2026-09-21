import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import clsx from "clsx";
import Screen from "../../components/layout/Screen";
import BottomNav from "../../components/layout/BottomNav";
import { api } from "../../lib/api";

const RANGES = [
  { value: "today", label: "วันนี้", days: 1 },
  { value: "week", label: "7 วันล่าสุด", days: 7 },
];

export default function Earnings() {
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState("today");

  useEffect(() => {
    api
      .get("/service-requests/driver/mine", { params: { status: "COMPLETED" } })
      .then(({ data }) => setTrips(data))
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลรายได้ไม่สำเร็จ"));
  }, []);

  const days = RANGES.find((r) => r.value === range).days;
  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  const shownTrips = (trips ?? [])
    .filter((t) => t.completedAt && new Date(t.completedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const total = shownTrips.reduce((sum, t) => sum + (t.fare ?? 0), 0);
  const avgFare = shownTrips.length ? Math.round(total / shownTrips.length) : 0;

  return (
    <div className="flex flex-1 flex-col">
      <Screen padded={false} className="gap-3 bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 pb-6 pt-6 text-white">
        <h1 className="text-lg font-bold">รายได้ของคุณ</h1>

        <div className="flex gap-2 rounded-full bg-white/10 p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={clsx(
                "flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors",
                range === r.value ? "bg-white text-emerald-700" : "text-white/70"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <p className="text-5xl font-bold">{total.toLocaleString()} ฿</p>
        <p className="text-sm text-emerald-100">
          {shownTrips.length} เที่ยว · เฉลี่ย {avgFare} ฿ ต่อเที่ยว
        </p>
      </Screen>

      <Screen className="gap-3 pt-4">
        <h2 className="text-sm font-bold text-slate-900">รายการเที่ยว</h2>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!trips && !error && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
          </div>
        )}

        {trips && shownTrips.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีเที่ยวที่เสร็จสิ้นในช่วงนี้</p>
        )}

        <div className="flex flex-col divide-y divide-slate-100">
          {shownTrips.map((trip) => (
            <div key={trip.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">{formatWhen(trip.completedAt)}</p>
                <p className="truncate text-sm font-medium text-slate-800">
                  {trip.pickupAddress ?? "-"} → {trip.destinationAddress ?? "-"}
                </p>
              </div>
              <p className="flex-none text-base font-bold text-emerald-600">{trip.fare} ฿</p>
            </div>
          ))}
        </div>
      </Screen>
      <BottomNav />
    </div>
  );
}

function formatWhen(iso) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  if (isToday) return time;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " · " + time;
}
