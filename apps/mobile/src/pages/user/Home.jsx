import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Bell, Loader2, Library, UtensilsCrossed, Home as HomeIcon, Building2, Landmark, DoorOpen } from "lucide-react";
import Screen from "../../components/layout/Screen";
import BottomNav from "../../components/layout/BottomNav";
import Card from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { useArea } from "../../context/AreaContext";
import AreaSwitcher from "../../components/shared/AreaSwitcher";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { useUnreadCount } from "../../lib/useUnreadCount";
import { useResumeActiveTrip } from "../../lib/useResumeActiveTrip";

const RECENT_LIMIT = 5;

// ไอคอนตามชื่อสถานที่ (สถานที่มาจาก DB และแอดมินเพิ่ม/แก้ได้เอง จึงเดาจากคำในชื่อ ไม่ผูกกับ id ตายตัว)
function iconFor(name) {
  if (/หอสมุด|ห้องสมุด/.test(name)) return Library;
  if (/โรงอาหาร|ตลาด/.test(name)) return UtensilsCrossed;
  if (/หอพัก|หอใน|หมู่บ้าน/.test(name)) return HomeIcon;
  if (/ประตู|หน้ามอ|ทางเข้า/.test(name)) return DoorOpen;
  if (/อาคาร|คอนแวนชั่น|คอนเวนชัน|ศร|คณะ/.test(name)) return Building2;
  return Landmark;
}

// เที่ยวที่จบแล้วล่าสุด ไม่ซ้ำปลายทาง — กดแล้วเรียกไปที่เดิมได้เลย
function recentDestinations(trips) {
  const seen = new Set();
  return trips
    .filter((t) => t.status === "COMPLETED")
    .sort((a, b) => new Date(b.completedAt ?? b.requestedAt) - new Date(a.completedAt ?? a.requestedAt))
    .filter((t) => {
      const key = t.destinationAddress ?? `${t.destinationLat},${t.destinationLng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, RECENT_LIMIT);
}

export default function Home() {
  const navigate = useNavigate();
  const { user, setBooking } = useApp();
  const { area, loading: areaLoading, loadError: areaError, reload: reloadAreas } = useArea();
  const hasSession = Boolean(getToken());
  const [landmarks, setLandmarks] = useState(null); // null = กำลังโหลด
  const [recent, setRecent] = useState(null); // null = กำลังโหลด / ไม่มี session
  const unread = useUnreadCount();
  // มีทริปที่ยังไม่จบ/ยังไม่จ่ายเงินค้างอยู่ไหม — ถ้ามีพาไปหน้านั้นเลยแทนที่จะโชว์หน้าแรกเหมือนไม่มีอะไรเกิดขึ้น
  const checkingActiveTrip = useResumeActiveTrip("user");

  // เดิม "จุดหมายยอดนิยม" และ "ล่าสุด" เป็นรายการ mock ตายตัว (เที่ยวล่าสุดของทุกคนเหมือนกันหมด) — ตอนนี้ใช้ข้อมูลจริง:
  // ยอดนิยม = สถานที่ที่แอดมินติ๊ก "ยอดนิยม" ในหน้าจัดการสถานที่, ล่าสุด = เที่ยวที่จบแล้วของบัญชีนี้
  // สถานที่ของพื้นที่ที่เลือกอยู่ — เปลี่ยนพื้นที่แล้วโหลดใหม่
  useEffect(() => {
    if (!area) return;
    setLandmarks(null);
    api
      .get("/landmarks", { params: { areaId: area.id } })
      .then(({ data }) => setLandmarks(data))
      .catch(() => setLandmarks([]));
  }, [area?.id]);

  useEffect(() => {
    if (!hasSession) return;
    api
      .get("/service-requests/mine")
      .then(({ data }) => setRecent(recentDestinations(data)))
      .catch(() => setRecent([]));
  }, [hasSession]);

  const popular = (landmarks ?? []).filter((l) => l.isPopular);

  function bookLandmark(landmark) {
    setBooking((b) => ({ ...b, destination: { landmarkId: landmark.id, name: landmark.name } }));
    navigate("/confirm-booking");
  }

  // ปลายทางเดิมที่ตรงกับสถานที่ในระบบใช้ landmarkId (ได้พิกัดล่าสุดที่แอดมินแก้ไว้) ไม่งั้นใช้จุดเดิมที่ปักหมุดไว้
  function bookTrip(trip) {
    const match = (landmarks ?? []).find((l) => l.name === trip.destinationAddress);
    if (match) return bookLandmark(match);
    setBooking((b) => ({
      ...b,
      destination: { lat: trip.destinationLat, lng: trip.destinationLng, name: trip.destinationAddress ?? "ปลายทางเดิม" },
    }));
    navigate("/confirm-booking");
  }

  if (checkingActiveTrip) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* หัวหน้าจอ: พื้นที่ให้บริการ (กดเปลี่ยนได้) + คำทักทาย + ค้นหาปลายทาง */}
      <div className="flex flex-none flex-col gap-4 rounded-b-[2rem] bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <AreaSwitcher tone="dark" />
          <button
            onClick={() => navigate("/notifications")}
            className="relative flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/15"
            aria-label="แจ้งเตือน"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-emerald-700 bg-red-500" />
            )}
          </button>
        </div>
        <div>
          <p className="text-sm text-emerald-100">{user.name ? `สวัสดี ${user.name}` : "สวัสดี"}</p>
          <h1 className="text-2xl font-bold">วันนี้จะไปไหนดี?</h1>
        </div>
        <button
          onClick={() => navigate("/search-destination")}
          disabled={!area}
          className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-left shadow-floating disabled:opacity-70"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Search className="h-4 w-4" />
          </span>
          <span className="text-sm text-slate-400">ค้นหาปลายทาง หรือปักหมุดบนแผนที่</span>
        </button>
      </div>

      {areaError && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          โหลดพื้นที่ให้บริการไม่สำเร็จ
          <button onClick={reloadAreas} className="font-semibold underline">
            ลองใหม่
          </button>
        </div>
      )}
      {!areaLoading && !areaError && !area && (
        <p className="mx-5 mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ยังไม่มีพื้นที่ที่เปิดให้บริการในขณะนี้
        </p>
      )}

      <Screen className="gap-6 pt-5">
        <div>
          <h2 className="mb-3 text-base font-bold text-slate-900">จุดหมายยอดนิยม</h2>
          {landmarks === null ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-500" />
          ) : popular.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มีจุดหมายยอดนิยม — ค้นหาปลายทางจากช่องด้านบนได้เลย</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {popular.map((l) => {
                const Icon = iconFor(l.name);
                return (
                  <button
                    key={l.id}
                    onClick={() => bookLandmark(l)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 px-2 py-3 text-center active:bg-slate-100"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-medium text-slate-700">{l.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">ล่าสุด</h2>
            <button onClick={() => navigate("/history")} className="text-xs font-medium text-emerald-600">
              ดูทั้งหมด
            </button>
          </div>
          {!hasSession ? (
            <p className="text-sm text-slate-400">เข้าสู่ระบบเพื่อดูการเดินทางล่าสุดของคุณ</p>
          ) : recent === null ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-500" />
          ) : recent.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มีการเดินทาง — เรียกวินครั้งแรกได้จากช่องค้นหาด้านบน</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((trip) => (
                <Card
                  key={trip.id}
                  className="flex cursor-pointer items-center gap-3 p-3 shadow-none ring-slate-100"
                  onClick={() => bookTrip(trip)}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-400">{trip.pickupAddress ?? "จุดรับ"}</p>
                    <p className="truncate text-sm font-medium text-slate-900">{trip.destinationAddress ?? "ปลายทาง"}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{trip.fare} ฿</span>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Screen>

      <BottomNav />
    </div>
  );
}
