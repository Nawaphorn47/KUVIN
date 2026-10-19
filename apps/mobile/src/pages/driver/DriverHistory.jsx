import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
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
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <header className="flex-none bg-brand-600 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <h1 className="text-2xl font-bold tracking-tight">ประวัติการขับ</h1>
        <p className="tabular mt-2 text-fare">
          {totalEarnings.toLocaleString()}
          <span className="ml-1 text-2xl font-bold">฿</span>
        </p>
        <p className="tabular mt-1 flex items-center gap-3 text-brand-100">
          <span>
            <span className="font-bold text-white">{totalTrips}</span> เที่ยวที่เสร็จ
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
            <span className="font-bold text-white">{rating ?? "-"}</span> คะแนนเฉลี่ย
          </span>
        </p>
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">รายวัน</h2>

        {error && (
          <p role="alert" className="rounded-xl bg-here-soft px-4 py-3 text-sm text-here">
            {error}
          </p>
        )}
        {!trips && !error && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-brand-600" aria-label="กำลังโหลด" />}
        {trips && days.length === 0 && <p className="py-10 text-center text-[15px] text-slate-600">ยังไม่มีทริปที่เสร็จสิ้น</p>}

        {days.length > 0 && (
          <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {days.map((d) => (
              <li key={d.date} className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-slate-900">{d.label}</p>
                  <p className="tabular text-sm text-slate-600">{d.trips} เที่ยว</p>
                </div>
                <p className="tabular flex-none text-xl font-bold text-slate-900">{d.earnings} ฿</p>
              </li>
            ))}
          </ul>
        )}
      </main>

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
