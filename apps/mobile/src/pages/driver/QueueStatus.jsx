import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import QueueRow from "../../components/shared/QueueRow";
import QueueSummary from "../../components/shared/QueueSummary";
import { useQueueOverview } from "../../lib/useQueueOverview";

export default function QueueStatus() {
  const navigate = useNavigate();
  const { overview, error } = useQueueOverview(true);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <header className="flex-none bg-brand-600 px-4 pb-5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="ย้อนกลับ"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">คิวรับงานตอนนี้</h1>
        </div>
        {overview && (
          <div className="mt-4">
            <QueueSummary overview={overview} />
          </div>
        )}
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {error && (
          <p role="alert" className="rounded-xl bg-here-soft px-4 py-3 text-sm text-here">
            {error}
          </p>
        )}
        {overview?.myPosition == null && overview && (
          <p className="mb-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            ยังไม่อยู่ในคิว กลับไปหน้าหลักแล้วแตะ “เริ่มรับงาน”
          </p>
        )}
        {overview?.queue.length === 0 && (
          <p className="py-10 text-center text-[15px] text-slate-600">ยังไม่มีคนขับออนไลน์ในคิวตอนนี้</p>
        )}
        {overview?.queue.length > 0 && (
          <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {overview.queue.map((row) => (
              <QueueRow key={row.driverId} row={row} activeOffer={overview.activeOffer} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
