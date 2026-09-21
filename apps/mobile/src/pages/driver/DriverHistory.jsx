import { useEffect, useState } from "react";
import { Loader2, Calendar } from "lucide-react";
import Screen from "../../components/layout/Screen";
import BottomNav from "../../components/layout/BottomNav";
import { api } from "../../lib/api";

export default function DriverHistory() {
  const [trips, setTrips] = useState(null);
  const [rating, setRating] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/service-requests/driver/mine", { params: { status: "COMPLETED" } })
      .then(({ data }) => setTrips(data))
      .catch((err) => setError(err.response?.data?.message || "โหลดประวัติไม่สำเร็จ"));
    api
      .get("/drivers/me")
      .then(({ data }) => setRating(data.ratingAvg))
      .catch(() => {});
  }, []);

  const days = groupByDay(trips ?? []);
  const totalEarnings = (trips ?? []).reduce((sum, t) => sum + (t.fare ?? 0), 0);
  const totalTrips = trips?.length ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <Screen padded={false} className="gap-2 bg-gradient-to-b from-emerald-700 to-emerald-800 px-5 pb-6 pt-6 text-white">
        <h1 className="text-xl font-bold">ประวัติการขับ</h1>
        <p className="text-sm text-emerald-100">สรุปทุกทริปที่เสร็จสิ้นแล้ว</p>
        <p className="text-5xl font-bold">{totalEarnings.toLocaleString()} ฿</p>
        <div className="mt-4 grid grid-cols-2 divide-x divide-white/15 rounded-2xl bg-white/10 py-3 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-300">{totalTrips}</p>
            <p className="text-xs text-white/60">เที่ยวรวม</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-sky-300">{rating != null ? `${rating} ★` : "-"}</p>
            <p className="text-xs text-white/60">คะแนนเฉลี่ย</p>
          </div>
        </div>
      </Screen>

      <Screen className="gap-3 pt-4">
        <h2 className="text-sm font-bold text-slate-900">รายการรายวัน</h2>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!trips && !error && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
          </div>
        )}

        {trips && days.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีทริปที่เสร็จสิ้น</p>
        )}

        <div className="flex flex-col divide-y divide-slate-100">
          {days.map((d) => (
            <div key={d.date} className="flex items-center gap-3 py-3.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Calendar className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{d.label}</p>
                <p className="text-xs text-slate-400">{d.trips} เที่ยว</p>
              </div>
              <p className="flex-none text-lg font-bold text-emerald-600">{d.earnings} ฿</p>
            </div>
          ))}
        </div>
      </Screen>
      <BottomNav />
    </div>
  );
}

function groupByDay(trips) {
  const map = new Map();
  for (const t of trips) {
    if (!t.completedAt) continue;
    const key = new Date(t.completedAt).toDateString();
    const label = new Date(t.completedAt).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const entry = map.get(key) ?? { date: key, label, trips: 0, earnings: 0 };
    entry.trips += 1;
    entry.earnings += t.fare ?? 0;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
}
