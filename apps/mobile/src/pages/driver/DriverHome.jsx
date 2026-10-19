import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, LogIn, Power, Star } from "lucide-react";
import clsx from "clsx";
import BottomNav from "../../components/layout/BottomNav";
import StopNumber from "../../components/ui/StopNumber";
import QueueRow from "../../components/shared/QueueRow";
import QueueSummary from "../../components/shared/QueueSummary";
import AreaSwitcher from "../../components/shared/AreaSwitcher";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { useQueueOverview } from "../../lib/useQueueOverview";
import { useDriverPresence } from "../../context/DriverPresenceContext";
import { useResumeActiveTrip } from "../../lib/useResumeActiveTrip";

const PREVIEW_ROWS = 4;

// สรุปทริปที่จบแล้วตั้งแต่เที่ยงคืนวันนี้ (เวลาเครื่อง) — เวลาวิ่งงานนับจากรับงานถึงจบทริป เพราะระบบไม่ได้เก็บเวลาออนไลน์
function summarizeToday(trips) {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const todays = trips.filter((t) => t.completedAt && new Date(t.completedAt) >= midnight);
  const minutes = todays.reduce((sum, t) => {
    if (!t.acceptedAt) return sum;
    return sum + Math.max(0, (new Date(t.completedAt) - new Date(t.acceptedAt)) / 60000);
  }, 0);
  return {
    income: todays.reduce((sum, t) => sum + (t.fare ?? 0), 0),
    trips: todays.length,
    minutes: Math.round(minutes),
  };
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} นาที`;
  return `${(minutes / 60).toFixed(1)} ชม.`;
}

export default function DriverHome() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [today, setToday] = useState(null); // { income, trips, minutes } ของวันนี้ (null = ยังโหลดไม่เสร็จ/ไม่มี session)
  const [toggleError, setToggleError] = useState("");
  const hasSession = Boolean(getToken());
  // สถานะออนไลน์+การรอฟังงานใหม่อยู่ระดับ App (DriverPresenceContext) ทำงานได้ตลอดไม่ว่าจะเปิดหน้าไหนอยู่
  // หน้านี้แค่อ่านค่ามาโชว์/ใช้ปุ่มสลับ
  const { online, notice, toggleOnline: setPresence } = useDriverPresence();
  const { overview, error: queueError } = useQueueOverview(hasSession && online === true);
  // มีทริปที่รับไว้แล้วยังไม่จบ (หรือจบแล้วยังไม่ได้เงิน) ค้างอยู่ไหม — เช่นรีเฟรชหน้ากลางทริป — พาไปหน้านั้นเลย
  const checkingActiveTrip = useResumeActiveTrip("driver");

  useEffect(() => {
    if (!hasSession) return;
    api
      .get("/drivers/me")
      .then(({ data }) => setProfile(data))
      .catch(() => setProfile(null));
    api
      .get("/service-requests/driver/mine", { params: { status: "COMPLETED" } })
      .then(({ data }) => setToday(summarizeToday(data)))
      .catch(() => setToday(null));
  }, [hasSession]);

  async function toggleOnline() {
    try {
      setToggleError("");
      await setPresence();
    } catch (err) {
      setToggleError(err.response?.data?.message || "เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  // ไม่ fallback เป็นข้อมูล mock — คนขับที่ยังไม่มีคะแนนต้องเห็น "-" ไม่ใช่คะแนนปลอม
  const vinNumber = profile?.vinNumber;
  const rating = profile?.ratingAvg;

  if (checkingActiveTrip) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="กำลังโหลด" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      {/* แผ่นป้ายหัว: ตัวฉัน (เสื้อวิน/คะแนน) → ปุ่มออนไลน์ใหญ่ → ลำดับคิวเป็นเลขใหญ่ */}
      <header className="flex-none bg-brand-600 px-4 pb-5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-3">
          {vinNumber ? <StopNumber n={vinNumber} size="lg" className="border-white" /> : <span className="h-12 w-12" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold leading-tight">{profile?.fullName ?? "คนขับ"}</p>
            <p className="tabular flex items-center gap-1 text-sm text-brand-100">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
              {rating ?? "-"} · เสื้อวินเบอร์ {vinNumber ?? "-"}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <AreaSwitcher readOnly tone="dark" />
        </div>

        {hasSession && (
          <button
            type="button"
            onClick={toggleOnline}
            disabled={online === null}
            aria-pressed={online === true}
            className={clsx(
              "mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-60",
              online ? "bg-white text-brand-800 shadow-sticker" : "bg-brand-800 text-white ring-2 ring-white/40"
            )}
          >
            {online ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-600" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-600" />
                </span>
                <span>ออนไลน์อยู่ · แตะเพื่อปิดรับงาน</span>
              </>
            ) : (
              <>
                <Power className="h-5 w-5" aria-hidden="true" />
                {online === null ? "กำลังโหลด..." : "แตะเพื่อเริ่มรับงาน"}
              </>
            )}
          </button>
        )}

        {(toggleError || notice) && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-here">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" /> {toggleError || notice}
          </p>
        )}

        {online && overview && (
          <div className="mt-4 border-t border-white/20 pt-4">
            <QueueSummary overview={overview} />
          </div>
        )}
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {!hasSession && (
          <button
            type="button"
            onClick={() => navigate("/login", { state: { role: "driver" } })}
            className="flex w-full items-center gap-3 rounded-xl bg-slate-900 p-4 text-left text-white shadow-floating active:scale-[0.98]"
          >
            <LogIn className="h-6 w-6 flex-none" aria-hidden="true" />
            <span>
              <span className="block text-base font-bold">เข้าสู่ระบบเพื่อรับงาน</span>
              <span className="block text-sm text-slate-300">ต้องล็อกอินก่อนถึงจะเข้าคิวได้</span>
            </span>
          </button>
        )}

        <section aria-labelledby="today-title" className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 id="today-title" className="text-base font-bold text-slate-900">
              วันนี้
            </h2>
            <button type="button" onClick={() => navigate("/driver/earnings")} className="h-9 text-sm font-bold text-brand-700">
              ดูการเงิน →
            </button>
          </div>
          <dl className="mt-1 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-slate-600">รายได้</dt>
              <dd className="tabular text-2xl font-bold text-slate-900">{today ? `${today.income} ฿` : "-"}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-slate-600">เที่ยว</dt>
              <dd className="tabular text-2xl font-bold text-slate-900">{today ? today.trips : "-"}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-slate-600">เวลาวิ่งงาน</dt>
              <dd className="tabular text-2xl font-bold text-slate-900">{today ? formatDuration(today.minutes) : "-"}</dd>
            </div>
          </dl>
        </section>

        {hasSession && (
          <section aria-labelledby="queue-title" className="mt-4">
            <h2 id="queue-title" className="mb-2 text-sm font-semibold text-slate-600">
              คิวรับงานตอนนี้
            </h2>
            {online === false && (
              <p className="rounded-xl bg-white px-4 py-5 text-center text-[15px] text-slate-600 ring-1 ring-slate-200">
                ปิดรับงานอยู่ แตะปุ่มด้านบนเพื่อเข้าคิว
              </p>
            )}
            {online !== false && queueError && (
              <p role="alert" className="rounded-xl bg-here-soft px-4 py-3 text-sm text-here">
                {queueError}
              </p>
            )}
            {online !== false && !queueError && !overview && <div className="h-24 animate-pulse rounded-xl bg-slate-200" />}
            {online !== false && !queueError && overview && (
              <>
                <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                  {overview.queue.slice(0, PREVIEW_ROWS).map((row) => (
                    <QueueRow key={row.driverId} row={row} activeOffer={overview.activeOffer} />
                  ))}
                </ul>
                {overview.queue.length > PREVIEW_ROWS && (
                  <button
                    type="button"
                    onClick={() => navigate("/driver/queue")}
                    className="mt-2 h-11 w-full text-center text-sm font-bold text-brand-700"
                  >
                    ดูคิวทั้งหมด ({overview.queue.length} คน) →
                  </button>
                )}
              </>
            )}
          </section>
        )}

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          ระบบเสนองานทีละคนตามลำดับคิว มีเวลาตอบรับ 15 วินาที กดปฏิเสธจะถูกเลื่อนไปท้ายคิว ปล่อยหมดเวลาติดกัน 3 ครั้งระบบจะปรับเป็นออฟไลน์ให้
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
