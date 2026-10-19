import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flag, Loader2 } from "lucide-react";
import BottomNav from "../../components/layout/BottomNav";
import Badge from "../../components/ui/Badge";
import RouteSummary from "../../components/shared/RouteSummary";
import { api } from "../../lib/api";

const STATUS = {
  COMPLETED: { label: "ถึงแล้ว", tone: "success" },
  CANCELLED: { label: "ยกเลิก", tone: "danger" },
  PENDING: { label: "รอคนขับ", tone: "info" },
  ACCEPTED: { label: "คนขับกำลังมา", tone: "info" },
  IN_PROGRESS: { label: "กำลังเดินทาง", tone: "info" },
};
const REPORT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // ตรงกับ tripSafety.service.js

function formatDateTime(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time} น.`;
}

// ทริปที่ยังแจ้งปัญหาได้: มีคนขับแล้ว และไม่เกิน 7 วัน
const canReport = (t) =>
  t.driver && Date.now() - new Date(t.completedAt ?? t.cancelledAt ?? t.requestedAt).getTime() <= REPORT_WINDOW_MS;

export default function History() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/service-requests/mine")
      .then(({ data }) => setTrips(data))
      .catch((err) => setError(err.response?.data?.message || "โหลดประวัติไม่สำเร็จ"));
  }, []);

  const done = (trips ?? []).filter((t) => t.status === "COMPLETED");
  const spent = done.reduce((sum, t) => sum + (t.fare ?? 0), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <header className="flex-none bg-brand-600 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <h1 className="text-2xl font-bold tracking-tight">ทริปของฉัน</h1>
        {trips && (
          <p className="tabular mt-2 flex items-baseline gap-4 text-brand-100">
            <span>
              <span className="text-3xl font-bold text-white">{done.length}</span> เที่ยว
            </span>
            <span>
              <span className="text-3xl font-bold text-white">{spent.toLocaleString()}</span> ฿
            </span>
          </p>
        )}
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {error && (
          <p role="alert" className="rounded-xl bg-here-soft px-4 py-3 text-sm text-here">
            {error}
          </p>
        )}
        {!trips && !error && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-brand-600" aria-label="กำลังโหลด" />}
        {trips?.length === 0 && (
          <div className="mt-10 text-center">
            <p className="text-base font-semibold text-slate-900">ยังไม่มีทริป</p>
            <p className="mt-1 text-sm text-slate-600">เรียกวินเที่ยวแรกจากหน้าแรกได้เลย</p>
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {trips?.map((trip) => {
            const s = STATUS[trip.status] ?? { label: trip.status, tone: "neutral" };
            return (
              <li key={trip.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <p className="tabular text-sm text-slate-600">{formatDateTime(trip.requestedAt)}</p>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <RouteSummary pickup={trip.pickupAddress ?? "จุดรับ"} destination={trip.destinationAddress ?? "-"} />
                  </div>
                  <p className="tabular flex-none text-xl font-bold text-slate-900">{trip.fare ?? 0} ฿</p>
                </div>
                {(trip.driver || canReport(trip)) && (
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <p className="truncate text-sm text-slate-600">
                      {trip.driver ? `${trip.driver.fullName} · ${trip.driver.licensePlate}` : ""}
                    </p>
                    {canReport(trip) && (
                      <button
                        type="button"
                        onClick={() => navigate("/report-trip", { state: { request: trip } })}
                        className="flex h-9 flex-none items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-slate-700 active:bg-slate-100"
                      >
                        <Flag className="h-4 w-4" aria-hidden="true" /> แจ้งปัญหา
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </main>
      <BottomNav />
    </div>
  );
}
