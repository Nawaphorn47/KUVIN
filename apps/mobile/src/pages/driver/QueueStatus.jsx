import TopBar from "../../components/layout/TopBar";
import Screen from "../../components/layout/Screen";
import QueueRow from "../../components/shared/QueueRow";
import { useQueueOverview } from "../../lib/useQueueOverview";

export default function QueueStatus() {
  const { overview, error } = useQueueOverview(true);

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <TopBar title="คิวรับงานตอนนี้" />
      <Screen className="gap-4 pt-2">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {overview && <SummaryCard overview={overview} />}

        <div className="flex flex-col gap-2">
          {overview?.queue.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีคนขับออนไลน์ในคิวตอนนี้</p>
          )}
          {overview?.queue.map((row) => (
            <QueueRow key={row.driverId} row={row} activeOffer={overview.activeOffer} />
          ))}
        </div>
      </Screen>
    </div>
  );
}

function SummaryCard({ overview }) {
  if (overview.myPosition == null) {
    return (
      <div className="flex flex-col gap-1 rounded-2xl bg-slate-900 p-4 text-white shadow-card">
        <p className="text-sm font-bold">คุณยังไม่อยู่ในคิว</p>
        <p className="text-xs text-white/60">ไปหน้าหลักแล้วกดปุ่มออนไลน์เพื่อเข้าคิวรับงาน</p>
      </div>
    );
  }

  const myRow = overview.queue.find((q) => q.isMe);
  if (myRow?.isActiveOffer) {
    return (
      <div className="flex flex-col gap-1 rounded-2xl bg-emerald-600 p-4 text-white shadow-card">
        <p className="text-sm font-bold">ถึงคิวของคุณแล้ว</p>
        <p className="text-xs text-white/80">ระบบกำลังรองานให้คุณตอบรับอยู่ เปิดแจ้งเตือนไว้เลย</p>
      </div>
    );
  }

  if (overview.aheadOfMe === 0) {
    return (
      <div className="flex flex-col gap-1 rounded-2xl bg-amber-500 p-4 text-white shadow-card">
        <p className="text-sm font-bold">คุณอยู่หัวคิว</p>
        <p className="text-xs text-white/80">มีงานเข้ามาเมื่อไหร่ ระบบจะเสนอให้คุณก่อนเลย</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-slate-900 p-4 text-white shadow-card">
      <p className="text-sm font-bold">อีก {overview.aheadOfMe} คิวถึงตาคุณ</p>
      <p className="text-xs text-white/60">
        ลำดับที่ {overview.myPosition} จาก {overview.queue.length} คนขับที่ออนไลน์อยู่ตอนนี้
      </p>
    </div>
  );
}
