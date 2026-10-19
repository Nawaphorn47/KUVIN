import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Crosshair, Loader2, Search, X } from "lucide-react";
import StopNumber from "../../components/ui/StopNumber";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { useArea } from "../../context/AreaContext";
import { areaCenter, distanceKm } from "../../lib/geo";

const STOP_LIMIT = 6; // ต้องตรงกับหน้าแรก — เลขยอดนิยม 1–6 ชุดเดียวกับหมุดบนแผนผัง

// ราคาโดยย่อของแต่ละปลายทาง ให้รู้ก่อนกด: ในเขตเหมาจ่าย = ราคาเดียว, นอกเขต = อัตราต่อกิโล
function FareHint({ inZone, area }) {
  return inZone ? (
    <span className="tabular flex-none text-lg font-bold text-slate-900">{area.flatFare} ฿</span>
  ) : (
    <span className="tabular flex-none text-sm font-semibold text-slate-600">{area.ratePerKm} ฿/กม.</span>
  );
}

function PlaceRow({ place, area, onPick }) {
  return (
    <li className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={() => onPick(place)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-brand-50"
      >
        {place.n ? (
          <StopNumber n={place.n} />
        ) : (
          <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center">
            <span className="h-3 w-3 rounded-[3px] bg-slate-900" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-slate-900">{place.name}</span>
          <span className="block truncate text-xs text-slate-500">
            {place.detail || (place.inZone ? "ในเขตเหมาจ่าย" : "นอกเขต · คิดตามระยะทางจริง")}
          </span>
        </span>
        <FareHint inZone={place.inZone} area={area} />
      </button>
    </li>
  );
}

export default function SearchDestination() {
  const navigate = useNavigate();
  const { booking, setBooking } = useApp();
  const { area } = useArea();
  const [query, setQuery] = useState("");
  const [landmarks, setLandmarks] = useState(null); // null = กำลังโหลด
  const [loadError, setLoadError] = useState(false);

  // รายชื่อสถานที่จริงจาก backend — เดิมถ้าโหลดไม่ได้จะโชว์รายการ mock แทน ซึ่งกดจองไม่ได้จริง (id ไม่ตรงกับ DB)
  // ผู้ใช้กดแล้วพังโดยไม่รู้สาเหตุ จึงบอกตรง ๆ ว่าโหลดไม่สำเร็จและให้ลองใหม่แทน
  // สถานที่ของพื้นที่ที่เลือกอยู่เท่านั้น
  function load() {
    if (!area) return;
    setLoadError(false);
    setLandmarks(null);
    api
      .get("/landmarks", { params: { areaId: area.id } })
      .then(({ data }) => setLandmarks(data))
      .catch(() => setLoadError(true));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [area?.id]);

  // เลขยอดนิยมเรียงเหมือนหน้าแรก + รู้ว่าอยู่ในเขตเหมาจ่ายไหม
  const places = useMemo(() => {
    if (!landmarks || !area) return [];
    const center = areaCenter(area);
    let n = 0;
    return landmarks.map((l) => ({
      ...l,
      n: l.isPopular && n < STOP_LIMIT ? ++n : null,
      inZone: distanceKm(center, { lat: l.lat, lng: l.lng }) <= area.flatRadiusKm,
    }));
  }, [landmarks, area]);

  const q = query.trim();
  const filtered = q ? places.filter((l) => l.name.includes(q) || l.detail?.includes(q)) : places;
  const popular = q ? [] : filtered.filter((l) => l.n);
  const rest = q ? filtered : filtered.filter((l) => !l.n);

  function pick(landmark) {
    setBooking((b) => ({ ...b, destination: { landmarkId: landmark.id, name: landmark.name } }));
    navigate("/confirm-booking");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      {/* แผ่นป้ายหัว: จุดรับ (ตำแหน่งตัวเอง จุดแดง) → ช่องพิมพ์ปลายทาง บนเส้นเดียวกัน */}
      <header className="flex-none bg-brand-600 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="ย้อนกลับ"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">ไปไหนดี?</h1>
        </div>
        <div className="mt-3 flex items-stretch gap-3 rounded-xl bg-white p-3 text-slate-900 shadow-sticker">
          <div aria-hidden="true" className="flex flex-col items-center py-2">
            <span className="h-3 w-3 rounded-full bg-here ring-2 ring-here-soft" />
            <span className="my-1 w-px flex-1 bg-slate-300" />
            <span className="h-3 w-3 rounded-[3px] bg-slate-900" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate border-b border-slate-200 pb-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">จาก </span>
              {booking.pickup}
            </p>
            <label htmlFor="dest-q" className="sr-only">
              ค้นหาปลายทาง
            </label>
            <div className="flex items-center gap-2 pt-2">
              <input
                id="dest-q"
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="พิมพ์ชื่อตึก คณะ หรือหอ"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="ล้างคำค้น"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <button
          type="button"
          onClick={() => navigate("/pick-on-map")}
          className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-brand-300 bg-white px-3 py-3 text-left active:bg-brand-50"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-600 text-white shadow-sticker">
            <Crosshair className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-bold text-slate-900">ปักหมุดเองบนแผนที่</span>
            <span className="block text-xs text-slate-600">ที่ที่ไม่อยู่ในรายการ เช่น หน้าบ้าน ร้านข้างทาง</span>
          </span>
        </button>

        {loadError && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-here-soft px-4 py-3 text-sm text-here">
            โหลดรายชื่อสถานที่ไม่สำเร็จ
            <button type="button" onClick={load} className="font-bold underline underline-offset-2">
              ลองใหม่
            </button>
          </div>
        )}
        {landmarks === null && !loadError && (
          <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-brand-600" aria-label="กำลังโหลดสถานที่" />
        )}
        {landmarks !== null && filtered.length === 0 && (
          <p className="mt-6 text-center text-sm text-slate-600">
            ไม่เจอ “{q}” ลองคำอื่น หรือปักหมุดเองด้านบนได้เลย
          </p>
        )}

        {popular.length > 0 && (
          <section aria-labelledby="popular-title" className="mt-5">
            <h2 id="popular-title" className="mb-2 text-sm font-semibold text-slate-600">
              ยอดนิยม · เลขเดียวกับบนแผนผัง
            </h2>
            <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              {popular.map((p) => (
                <PlaceRow key={p.id} place={p} area={area} onPick={pick} />
              ))}
            </ul>
          </section>
        )}

        {rest.length > 0 && (
          <section aria-labelledby="all-title" className="mt-5">
            <h2 id="all-title" className="mb-2 text-sm font-semibold text-slate-600">
              {q ? `ผลการค้นหา ${rest.length} ที่` : "สถานที่อื่น ๆ"}
            </h2>
            <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              {rest.map((p) => (
                <PlaceRow key={p.id} place={p} area={area} onPick={pick} />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
