import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Bike, Power, Hash, LogIn, AlertTriangle } from "lucide-react";
import Screen from "../../components/layout/Screen";
import BottomNav from "../../components/layout/BottomNav";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import MapView from "../../components/shared/MapView";
import { useGeolocation } from "../../lib/useGeolocation";
import { CAMPUS_CENTER, isNearCampus } from "../../lib/geo";
import QueueRow from "../../components/shared/QueueRow";
import { currentDriver } from "../../lib/mockData";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { useQueueOverview } from "../../lib/useQueueOverview";
import { useDriverPresence } from "../../context/DriverPresenceContext";
import clsx from "clsx";

const PREVIEW_ROWS = 4;

export default function DriverHome() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [toggleError, setToggleError] = useState("");
  const hasSession = Boolean(getToken());
  // สถานะออนไลน์+การรอฟังงานใหม่ย้ายไปอยู่ระดับ App แล้ว (DriverPresenceContext) ทำงานได้ตลอดไม่ว่าจะเปิด
  // หน้าไหนอยู่ — หน้านี้แค่อ่านค่ามาโชว์/ใช้ปุ่มสลับเฉย ๆ
  const { online, notice, toggleOnline: setPresence } = useDriverPresence();
  const { position: gpsPos } = useGeolocation();
  const myMapPos = gpsPos && isNearCampus(gpsPos) ? gpsPos : null; // นอกพื้นที่/ไม่มี GPS → แสดงแผนที่มหาวิทยาลัยเฉย ๆ
  const { overview, error: queueError } = useQueueOverview(hasSession && online === true);

  // ดึงโปรไฟล์คนขับจริงตอนมี session (แทนข้อมูล mock) — จะได้เบอร์วิน/คะแนนจริงตามบัญชีที่ login อยู่
  useEffect(() => {
    if (!hasSession) return;
    api
      .get("/drivers/me")
      .then(({ data }) => setProfile(data))
      .catch(() => setProfile(null));
  }, [hasSession]);

  async function toggleOnline() {
    try {
      setToggleError("");
      await setPresence();
    } catch (err) {
      setToggleError(err.response?.data?.message || "เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  const displayName = profile?.fullName ?? currentDriver.name;
  const vinNumber = profile?.vinNumber ?? currentDriver.vinNumber;
  const rating = profile?.ratingAvg ?? currentDriver.rating;

  return (
    <div className="flex flex-1 flex-col">
      <Screen padded={false} className="gap-4 px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Bike className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-400">{displayName}</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3 text-slate-400" /> {vinNumber}
                </span>
                <span className="flex items-center gap-0.5 text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400" /> {rating ?? "-"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={toggleOnline}
            disabled={!hasSession || online === null}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold disabled:opacity-40",
              online ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
            )}
          >
            <Power className="h-3.5 w-3.5" />
            {online === null ? "กำลังโหลด..." : online ? "ออนไลน์" : "ออฟไลน์"}
          </button>
        </div>

        {(toggleError || notice) && (
          <p className="flex items-start gap-1.5 text-xs text-red-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" /> {toggleError || notice}
          </p>
        )}

        <MapView height="h-40" me={myMapPos} fit={[[(myMapPos ?? CAMPUS_CENTER).lat, (myMapPos ?? CAMPUS_CENTER).lng]]} />
      </Screen>

      <Screen className="gap-4 pt-2">
        <Card className="gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">วันนี้</h2>
            <button onClick={() => navigate("/driver/earnings")} className="text-sm font-medium text-emerald-600">
              ดูรายได้ →
            </button>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-600">320 ฿</p>
              <p className="text-xs text-slate-400">รายได้</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-700">12</p>
              <p className="text-xs text-slate-400">เที่ยว</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-500">5.5 ชม.</p>
              <p className="text-xs text-slate-400">ชั่วโมง</p>
            </div>
          </div>
        </Card>

        {!hasSession ? (
          <button
            onClick={() => navigate("/login", { state: { role: "driver" } })}
            className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-3xl bg-slate-900 text-white"
          >
            <LogIn className="h-6 w-6" />
            <span className="text-base font-bold">เข้าสู่ระบบเพื่อรับงาน</span>
            <span className="text-xs text-white/60">ต้องล็อกอินก่อนถึงจะเข้าคิวรับงานได้</span>
          </button>
        ) : online === null ? (
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
        ) : online ? (
          <QueuePreview overview={overview} error={queueError} navigate={navigate} />
        ) : (
          <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-3xl bg-slate-100 text-slate-400">
            <span className="text-lg font-bold">ปิดรับงาน</span>
            <span className="text-xs">แตะปุ่มออนไลน์เพื่อเข้าคิวรับงาน</span>
          </div>
        )}

        <Card className="gap-2 shadow-none ring-slate-100">
          <div className="flex items-center gap-2">
            <Badge tone="info">วิธีทำงานของคิว</Badge>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            ระบบเสนองานให้คนขับ<b>ทีละคนตามลำดับที่เข้าคิว</b> มีเวลาตอบรับ 15 วินาที กดปฏิเสธจะถูกเลื่อนไปท้ายคิว
            ส่วนการปล่อยให้หมดเวลาติดกัน 3 ครั้ง ระบบจะปรับสถานะเป็นออฟไลน์ให้อัตโนมัติ
          </p>
        </Card>
      </Screen>

      <BottomNav />
    </div>
  );
}

// การ์ดคิวสด ๆ อยู่หน้าแรกเลย ไม่ต้องกดเข้าไปหน้าอื่น — โชว์สรุปสถานะตัวเอง + คิวสองสามอันดับแรก
function QueuePreview({ overview, error, navigate }) {
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!overview) {
    return <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />;
  }

  const summary =
    overview.myPosition == null
      ? { tone: "bg-slate-900", text: "ยังไม่พบคุณในคิว (รอสักครู่)" }
      : overview.queue.find((q) => q.isMe)?.isActiveOffer
        ? { tone: "bg-emerald-600", text: "ถึงคิวของคุณแล้ว รอตอบรับงาน" }
        : overview.aheadOfMe === 0
          ? { tone: "bg-amber-500", text: "คุณอยู่หัวคิว มีงานเข้ามาเสนอให้คุณก่อนเลย" }
          : { tone: "bg-slate-900", text: `อีก ${overview.aheadOfMe} คิวถึงตาคุณ (ลำดับที่ ${overview.myPosition})` };

  const rows = overview.queue.slice(0, PREVIEW_ROWS);

  return (
    <div className="flex flex-col gap-2">
      <div className={clsx("rounded-2xl p-3 text-center text-sm font-bold text-white shadow-card", summary.tone)}>
        {summary.text}
      </div>
      {rows.map((row) => (
        <QueueRow key={row.driverId} row={row} activeOffer={overview.activeOffer} />
      ))}
      {overview.queue.length > PREVIEW_ROWS && (
        <button
          onClick={() => navigate("/driver/queue")}
          className="text-center text-sm font-medium text-emerald-600"
        >
          ดูคิวทั้งหมด ({overview.queue.length} คน) →
        </button>
      )}
    </div>
  );
}
