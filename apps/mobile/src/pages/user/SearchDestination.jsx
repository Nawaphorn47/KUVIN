import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin, Search } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import { kuLandmarks } from "../../lib/mockData";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";

export default function SearchDestination() {
  const navigate = useNavigate();
  const { booking, setBooking } = useApp();
  const [query, setQuery] = useState("");
  const [landmarks, setLandmarks] = useState(kuLandmarks);

  // ดึงรายชื่อสถานที่จริงจาก backend (มี id ตรงกับ DB ใช้จองจริงได้) — ถ้าเรียกไม่ได้ (backend ปิดอยู่)
  // ใช้รายการ mock แทนไปก่อนเพื่อให้เลื่อนดู UI ได้ แต่จะกดจองจริงจากรายการนั้นไม่ได้
  useEffect(() => {
    api
      .get("/landmarks")
      .then(({ data }) => setLandmarks(data))
      .catch(() => setLandmarks(kuLandmarks));
  }, []);

  const filtered = landmarks.filter(
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            เลือกจุดหมาย
          </p>
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
