import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Bell, Loader2, Library, UtensilsCrossed, Home as HomeIcon, Building2, Landmark, DoorOpen } from "lucide-react";
import Screen from "../../components/layout/Screen";
import BottomNav from "../../components/layout/BottomNav";
import Card from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { popularDestinations, recentTrips } from "../../lib/mockData";
import { api } from "../../lib/api";
import { useUnreadCount } from "../../lib/useUnreadCount";
import { useResumeActiveTrip } from "../../lib/useResumeActiveTrip";

const destinationIcons = {
  lib: Library,
  "canteen-central": UtensilsCrossed,
  dorm: HomeIcon,
  convention: Building2,
  sr4: Landmark,
  "front-gate": DoorOpen,
};

export default function Home() {
  const navigate = useNavigate();
  const { user, setBooking } = useApp();
  const [landmarks, setLandmarks] = useState([]);
  const unread = useUnreadCount();
  // มีทริปที่ยังไม่จบ/ยังไม่จ่ายเงินค้างอยู่ไหม — ถ้ามีพาไปหน้านั้นเลยแทนที่จะโชว์หน้าแรกเหมือนไม่มีอะไรเกิดขึ้น
  const checkingActiveTrip = useResumeActiveTrip("user");

  useEffect(() => {
    api
      .get("/landmarks")
      .then(({ data }) => setLandmarks(data))
      .catch(() => setLandmarks([]));
  }, []);

  // จองด่วนจากจุดหมายยอดนิยม/ล่าสุด — จับคู่กับสถานที่จริงจากชื่อ ถ้าเจอพาไปยืนยันจองได้เลย
  // ถ้าไม่เจอ (ยังไม่ได้ต่อ backend) พาไปหน้าค้นหาแทนเพื่อเลือกจุดหมายจริงเอง
  function bookTo(name) {
    const match = landmarks.find((l) => l.name === name);
    if (match) {
      setBooking((b) => ({ ...b, destination: { landmarkId: match.id, name: match.name } }));
      navigate("/confirm-booking");
    } else {
      navigate("/search-destination");
    }
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
      <Screen padded={false} className="gap-5 px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">สวัสดี</p>
            <p className="text-lg font-bold text-slate-900">{user.name}</p>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card"
          >
            <Bell className="h-5 w-5 text-emerald-700" />
            {unread > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            )}
          </button>
        </div>

        <button
          onClick={() => navigate("/search-destination")}
          className="flex h-14 items-center gap-3 rounded-3xl bg-white px-4 shadow-card"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Search className="h-4 w-4" />
          </span>
          <span className="text-sm text-slate-400">ไปไหน? ค้นหาปลายทาง...</span>
        </button>
      </Screen>

      <Screen className="gap-6 pt-2">
        <div>
          <h2 className="mb-3 text-base font-bold text-slate-900">จุดหมายยอดนิยม</h2>
          <div className="grid grid-cols-3 gap-3">
            {popularDestinations.map((d) => {
              const Icon = destinationIcons[d.id] ?? Landmark;
              return (
                <button
                  key={d.id}
                  onClick={() => bookTo(d.name)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 px-2 py-3 text-center active:bg-slate-100"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-slate-700">{d.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">ล่าสุด</h2>
            <button onClick={() => navigate("/history")} className="text-xs font-medium text-emerald-600">
              ดูทั้งหมด
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {recentTrips.map((trip) => (
              <Card
                key={trip.id}
                className="flex cursor-pointer items-center gap-3 p-3 shadow-none ring-slate-100"
                onClick={() => bookTo(trip.to)}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Search className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-slate-400">{trip.from}</p>
                  <p className="truncate text-sm font-medium text-slate-900">{trip.to}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">{trip.fare} ฿</span>
              </Card>
            ))}
          </div>
        </div>
      </Screen>

      <BottomNav />
    </div>
  );
}
