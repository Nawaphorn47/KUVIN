import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin, Search, Crosshair, Loader2 } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";

export default function SearchDestination() {
  const navigate = useNavigate();
  const { booking, setBooking } = useApp();
  const [query, setQuery] = useState("");
  const [landmarks, setLandmarks] = useState(null); // null = กำลังโหลด
  const [loadError, setLoadError] = useState(false);

  // รายชื่อสถานที่จริงจาก backend — เดิมถ้าโหลดไม่ได้จะโชว์รายการ mock แทน ซึ่งกดจองไม่ได้จริง (id ไม่ตรงกับ DB)
  // ผู้ใช้กดแล้วพังโดยไม่รู้สาเหตุ จึงบอกตรง ๆ ว่าโหลดไม่สำเร็จและให้ลองใหม่แทน
  function load() {
    setLoadError(false);
    setLandmarks(null);
    api
      .get("/landmarks")
      .then(({ data }) => setLandmarks(data))
      .catch(() => setLoadError(true));
  }
  useEffect(load, []);

  const filtered = (landmarks ?? []).filter(
    (l) => l.name.includes(query) || l.detail?.includes(query)
  );

  function pick(landmark) {
    setBooking((b) => ({ ...b, destination: { landmarkId: landmark.id, name: landmark.name } }));
    navigate("/confirm-booking");
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="เลือกเส้นทาง" />
      <Screen padded={false} className="gap-0">
        <div className="flex flex-col gap-2 px-5 pb-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-slate-900">{booking.pickup}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2.5">
            <MapPin className="h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ปลายทาง"
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          <button
            onClick={() => navigate("/pick-on-map")}
            className="mb-3 flex w-full items-center gap-3 rounded-xl bg-emerald-50 px-3 py-3 text-left"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-emerald-600 text-white">
              <Crosshair className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-800">ปักหมุดบนแผนที่</p>
              <p className="text-xs text-emerald-700/70">เลือกจุดที่ไม่มีในรายการ</p>
            </div>
          </button>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            เลือกจุดหมาย
          </p>
          {loadError && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm text-slate-500">โหลดรายชื่อสถานที่ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต</p>
              <button onClick={load} className="text-sm font-semibold text-emerald-600">
                ลองใหม่
              </button>
            </div>
          )}
          {landmarks === null && !loadError && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-emerald-500" />}
          {landmarks !== null && filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">ไม่พบสถานที่ที่ค้นหา ลองปักหมุดบนแผนที่แทนได้</p>
          )}
          <div className="flex flex-col divide-y divide-slate-100">
            {filtered.map((landmark) => (
              <button
                key={landmark.id}
                onClick={() => pick(landmark)}
                className="flex items-center gap-3 py-3 text-left"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Search className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{landmark.name}</p>
                  <p className="truncate text-xs text-slate-400">{landmark.detail}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Screen>
    </div>
  );
}
