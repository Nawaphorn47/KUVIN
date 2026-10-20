import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, Bell, Loader2, Siren, RotateCcw, ChevronRight } from "lucide-react";
import clsx from "clsx";
import BottomNav from "../../components/layout/BottomNav";
import Button from "../../components/ui/Button";
import StopNumber from "../../components/ui/StopNumber";
import MapView from "../../components/shared/MapView";
import AreaSwitcher from "../../components/shared/AreaSwitcher";
import { useApp } from "../../context/AppContext";
import { useArea } from "../../context/AreaContext";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { areaCenter, distanceKm } from "../../lib/geo";
import { useUnreadCount } from "../../lib/useUnreadCount";
import { useResumeActiveTrip } from "../../lib/useResumeActiveTrip";

const RECENT_LIMIT = 3;
const STOP_LIMIT = 6; // หมุดเลขบนแผนผังไม่เกินจำนวนนี้ ไม่งั้นแผนที่รกจนอ่านไม่ออก

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

// ตำแหน่งปัจจุบันสำหรับจุด "คุณอยู่ที่นี่" — ไม่ได้ (ไม่อนุญาต/ไม่ใช่ https) ก็แค่ไม่โชว์จุด
function useMyPosition() {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!("geolocation" in navigator) || !window.isSecureContext) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);
  return pos;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, setBooking } = useApp();
  const { area, loading: areaLoading, loadError: areaError, reload: reloadAreas } = useArea();
  const hasSession = Boolean(getToken());
  const [landmarks, setLandmarks] = useState(null); // null = กำลังโหลด
  const [recent, setRecent] = useState(null); // null = กำลังโหลด / ไม่มี session
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null); // ซูมไปที่ปลายทางที่ผู้ใช้เลือกเอง (ตอนเปิดหน้ายังเห็นภาพรวมทั้งหมด)
  const rowRefs = useRef({});
  const unread = useUnreadCount();
  const me = useMyPosition();
  // มีทริปที่ยังไม่จบ/ยังไม่จ่ายเงินค้างอยู่ไหม — ถ้ามีพาไปหน้านั้นเลยแทนที่จะโชว์หน้าแรกเหมือนไม่มีอะไรเกิดขึ้น
  const checkingActiveTrip = useResumeActiveTrip("user");

  // สถานที่ของพื้นที่ที่เลือกอยู่ — เปลี่ยนพื้นที่แล้วโหลดใหม่
  useEffect(() => {
    if (!area) return;
    setLandmarks(null);
    setSelectedId(null);
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

  // ปลายทางบนป้ายแผนผัง = สถานที่ยอดนิยมที่แอดมินติ๊กไว้ เรียงเลข 1, 2, 3 … ให้ตรงกันทั้งบนแผนที่และในรายการ
  const stops = useMemo(() => {
    const center = areaCenter(area);
    return (landmarks ?? [])
      .filter((l) => l.isPopular)
      .slice(0, STOP_LIMIT)
      .map((l, i) => ({
        ...l,
        n: i + 1,
        inZone: area ? distanceKm(center, { lat: l.lat, lng: l.lng }) <= area.flatRadiusKm : false,
      }));
  }, [landmarks, area]);

  const selected = stops.find((s) => s.id === selectedId) ?? stops[0] ?? null;

  function selectStop(id, { scroll = true } = {}) {
    setSelectedId(id);
    const s = stops.find((x) => x.id === id);
    if (s) setFocus({ lat: s.lat, lng: s.lng });
    if (!scroll) return;
    rowRefs.current[id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

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
      <div className="flex flex-1 items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="กำลังโหลด" />
      </div>
    );
  }

  const zone = area ? { ...areaCenter(area), radiusKm: area.flatRadiusKm } : null;
  const fitPoints = [...stops.map((s) => [s.lat, s.lng]), me && [me.lat, me.lng]].filter(Boolean);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      {/* แผ่นป้ายหัว: พื้นที่ (กดเปลี่ยนได้) แจ้งเตือน SOS และคำถามหลักของหน้า */}
      <header className="flex-none bg-brand-600 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <AreaSwitcher tone="dark" />
          </div>
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="relative flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
            aria-label={unread > 0 ? `แจ้งเตือน ${unread} รายการใหม่` : "แจ้งเตือน"}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-brand-600 bg-here" />}
          </button>
          <button
            type="button"
            onClick={() => navigate("/sos")}
            className="flex h-10 flex-none items-center gap-1.5 rounded-lg bg-here px-3 text-sm font-bold shadow-sticker active:brightness-90"
          >
            <Siren className="h-4 w-4" /> SOS
          </button>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-brand-100">{user.name ? `หวัดดี ${user.name}` : "หวัดดี"}</p>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">ไปไหนดี?</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/search-destination")}
          disabled={!area}
          className="mt-3 flex h-12 w-full items-center gap-3 rounded-xl bg-white px-4 text-left text-slate-500 shadow-sticker disabled:opacity-80"
        >
          <Search className="h-5 w-5 text-brand-600" />
          <span className="text-[15px]">ค้นหาปลายทาง หรือปักหมุดเอง</span>
        </button>
      </header>

      {/* กล่องเลื่อนธรรมดา (ไม่ใช่ flex) — ไม่งั้นแผนที่ถูกบีบให้เตี้ยลงเมื่อรายการยาว */}
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {areaError && (
          <div className="mx-4 mt-4 flex items-center justify-between rounded-xl bg-here-soft px-4 py-3 text-sm text-here">
            <span>โหลดพื้นที่ให้บริการไม่สำเร็จ</span>
            <button type="button" onClick={reloadAreas} className="font-bold underline underline-offset-2">
              ลองใหม่
            </button>
          </div>
        )}
        {!areaLoading && !areaError && !area && (
          <p className="mx-4 mt-4 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
            ยังไม่มีพื้นที่ที่เปิดให้บริการในขณะนี้
          </p>
        )}

        {area && (
          <section aria-label="แผนผังพื้นที่" className="px-4 pt-4">
            <MapView
              height="h-64"
              zone={zone}
              stops={stops}
              selectedStopId={selected?.id}
              onStopSelect={selectStop}
              me={me}
              hereLabel="คุณอยู่ที่นี่"
              focus={focus}
              fit={fitPoints.length ? fitPoints : [[zone.lat, zone.lng]]}
              interactive
            >
              <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-brand-800 shadow-sm">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed border-brand-600 bg-brand-200 align-[-1px]" />
                เขตเหมาจ่าย {area.flatFare} ฿
              </span>
            </MapView>
          </section>
        )}

        <section aria-labelledby="stops-title" className="px-4 pt-4">
          <h2 id="stops-title" className="mb-2 text-sm font-semibold text-slate-600">
            แตะเลขเพื่อเลือกปลายทาง
          </h2>
          {landmarks === null && (
            <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-brand-600" aria-label="กำลังโหลดสถานที่" />
          )}
          {landmarks !== null && stops.length === 0 && (
            <p className="rounded-xl bg-white px-4 py-4 text-sm text-slate-600 ring-1 ring-slate-200">
              ยังไม่มีปลายทางยอดนิยมในพื้นที่นี้ ค้นหาจากช่องด้านบนได้เลย
            </p>
          )}
          {landmarks !== null && stops.length > 0 && (
            <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              {stops.map((s) => {
                const isSel = s.id === selected?.id;
                return (
                  <li key={s.id} className="border-b border-slate-200 last:border-b-0">
                    <button
                      type="button"
                      ref={(el) => (rowRefs.current[s.id] = el)}
                      onClick={() => selectStop(s.id, { scroll: false })}
                      aria-pressed={isSel}
                      className={clsx(
                        "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                        isSel ? "bg-brand-50" : "active:bg-slate-50"
                      )}
                    >
                      <StopNumber n={s.n} selected={isSel} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-slate-900">{s.name}</span>
                        <span className="block text-xs text-slate-500">
                          {s.inZone ? "ในเขตเหมาจ่าย" : "นอกเขต · คิดตามระยะทางจริง"}
                        </span>
                      </span>
                      <span className="tabular flex-none text-right">
                        {s.inZone ? (
                          <span className="text-xl font-bold text-slate-900">{area.flatFare} ฿</span>
                        ) : (
                          <span className="text-sm font-semibold text-slate-600">{area.ratePerKm} ฿/กม.</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {hasSession && recent?.length > 0 && (
          <section aria-labelledby="recent-title" className="px-4 pb-4 pt-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="recent-title" className="text-sm font-semibold text-slate-600">
                ไปที่เดิมอีก
              </h2>
              <button type="button" onClick={() => navigate("/history")} className="text-sm font-bold text-brand-700">
                ดูทั้งหมด
              </button>
            </div>
            <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              {recent.map((trip) => (
                <li key={trip.id} className="border-b border-slate-200 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => bookTrip(trip)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <RotateCcw className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-slate-900">
                        {trip.destinationAddress ?? "ปลายทางเดิม"}
                      </span>
                      <span className="block truncate text-xs text-slate-500">จาก {trip.pickupAddress ?? "จุดรับเดิม"}</span>
                    </span>
                    <span className="tabular text-sm font-bold text-slate-700">{trip.fare} ฿</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="h-4 flex-none" />
      </main>

      {/* ปุ่มหลักชิ้นเดียวของหน้า บอกชัดว่าจะเรียกไปไหน */}
      {selected && (
        <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
          <Button onClick={() => bookLandmark(selected)}>
            <span className="tabular flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm text-brand-700">
              {selected.n}
            </span>
            <motion.span key={selected.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="truncate">
              เรียกวินไป {selected.name}
            </motion.span>
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
