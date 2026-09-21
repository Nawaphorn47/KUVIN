import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Bike, Check, Loader2, MapPin, Plus, Search, Trash2 } from "lucide-react";
import clsx from "clsx";
import Button from "../components/Button";
import { api } from "../services/api";
import { getToken } from "../lib/auth";

// จุดกลางมหาวิทยาลัย (OSM way 259034448) — ต้องตรงกับ CAMPUS_CENTER ใน apps/api/src/utils/geo.js
const CAMPUS_CENTER = [14.023, 99.9739];
const FAR_FROM_CAMPUS_KM = 6; // ไกลกว่านี้ให้เตือน (ตลาดกำแพงแสนอยู่ ~3.5 กม. ถือว่าปกติ)

const pin = (color, size, ring) =>
  L.divIcon({
    className: "",
    iconSize: [size + 10, size + 10],
    iconAnchor: [(size + 10) / 2, (size + 10) / 2],
    html: `<div style="width:${size + 10}px;height:${size + 10}px" class="flex items-center justify-center"><div style="width:${size}px;height:${size}px" class="rounded-full border-2 border-white ${color} shadow ${ring ?? ""}"></div></div>`,
  });
const ICON_VERIFIED = pin("bg-emerald-600", 12);
const ICON_ESTIMATED = pin("bg-amber-500", 12);
const ICON_SELECTED = pin("bg-blue-600", 20, "ring-4 ring-blue-300/60");

function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a[0])) * Math.cos(toRad(b[0]));
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// เลื่อนแผนที่ไปที่ตำแหน่งเมื่อ flyKey เปลี่ยน (= เลือกรายการใหม่) ไม่เลื่อนตามทุกครั้งที่ลากหมุด
function FlyTo({ position, flyKey }) {
  const map = useMap();
  useEffect(() => {
    if (position && flyKey) map.flyTo(position, Math.max(map.getZoom(), 17), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyKey]);
  return null;
}

// คลิกบนแผนที่ = ย้ายหมุดของสถานที่ที่กำลังแก้ไขมาตรงนั้น (ทางลัดแทนการลากไกล ๆ)
function ClickToPlace({ enabled, onPlace }) {
  useMapEvents({
    click: (e) => {
      if (enabled) onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const emptyDraft = () => ({
  id: null,
  name: "",
  detail: "",
  lat: CAMPUS_CENTER[0],
  lng: CAMPUS_CENTER[1],
  isPopular: false,
  coordsVerified: false,
});

const toDraft = (l) => ({
  id: l.id,
  name: l.name,
  detail: l.detail ?? "",
  lat: l.lat,
  lng: l.lng,
  isPopular: l.isPopular,
  coordsVerified: l.coordsVerified,
});

export default function LandmarkManager() {
  const navigate = useNavigate();
  const [landmarks, setLandmarks] = useState(null);
  const [draft, setDraft] = useState(null); // null = ยังไม่ได้เลือก/สร้าง
  const [flyKey, setFlyKey] = useState(0);
  const [query, setQuery] = useState("");
  const [onlyEstimated, setOnlyEstimated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/landmarks");
      setLandmarks(data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate("/login");
      else setError("โหลดรายการสถานที่ไม่สำเร็จ");
    }
  }, [navigate]);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    load();
  }, [load, navigate]);

  const estimatedCount = (landmarks ?? []).filter((l) => !l.coordsVerified).length;
  const visible = useMemo(
    () =>
      (landmarks ?? []).filter(
        (l) => (!onlyEstimated || !l.coordsVerified) && (l.name.includes(query) || l.detail?.includes(query))
      ),
    [landmarks, query, onlyEstimated]
  );

  function select(l) {
    setError("");
    setDraft(toDraft(l));
    setFlyKey((k) => k + 1);
  }

  function startNew() {
    setError("");
    setDraft(emptyDraft());
    setFlyKey((k) => k + 1);
  }

  // ย้ายหมุด: ถือว่าผู้ดูแลตรวจตำแหน่งแล้ว จึงติ๊ก "ยืนยันพิกัด" ให้อัตโนมัติ (ยกเลิกติ๊กเองได้)
  const place = (lat, lng) =>
    setDraft((d) => (d ? { ...d, lat, lng, coordsVerified: true } : d));

  async function save() {
    if (!draft.name.trim()) {
      setError("ต้องระบุชื่อสถานที่");
      return;
    }
    setSaving(true);
    setError("");
    const body = {
      name: draft.name,
      detail: draft.detail,
      lat: Number(draft.lat),
      lng: Number(draft.lng),
      isPopular: draft.isPopular,
      coordsVerified: draft.coordsVerified,
    };
    try {
      const { data } = draft.id ? await api.patch(`/admin/landmarks/${draft.id}`, body) : await api.post("/admin/landmarks", body);
      await load();
      setDraft(toDraft(data));
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft.id || !window.confirm(`ลบ "${draft.name}" ออกจากรายการสถานที่?\n(ประวัติการเดินทางเดิมไม่ได้รับผลกระทบ)`)) return;
    setSaving(true);
    try {
      await api.delete(`/admin/landmarks/${draft.id}`);
      setDraft(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "ลบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const draftPos = draft ? [Number(draft.lat), Number(draft.lng)] : null;
  const validPos = draftPos && Number.isFinite(draftPos[0]) && Number.isFinite(draftPos[1]);
  const farKm = validPos ? distanceKm(CAMPUS_CENTER, draftPos) : 0;

  return (
    <div className="flex h-screen flex-col bg-stone-50">
      <header className="flex h-16 flex-none items-center justify-between border-b border-stone-200 bg-white px-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl text-emerald-900">
          <Bike className="h-6 w-6" /> จัดการสถานที่
        </h1>
        <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-800">
          <ArrowLeft className="h-4 w-4" /> กลับแดชบอร์ด
        </Link>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* ---- รายการ + ฟอร์ม ---- */}
        <aside className="flex min-h-0 flex-col border-r border-stone-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-stone-200 p-4">
            <div className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2">
              <Search className="h-4 w-4 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาสถานที่"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-stone-600">
                <input type="checkbox" checked={onlyEstimated} onChange={(e) => setOnlyEstimated(e.target.checked)} />
                เฉพาะพิกัดที่ยังเป็นค่าประมาณ ({estimatedCount})
              </label>
              <Button onClick={startNew} className="px-3 py-1.5">
                <Plus className="h-3.5 w-3.5" /> เพิ่ม
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {landmarks === null && <p className="p-4 text-sm text-stone-500">กำลังโหลด...</p>}
            {visible.map((l) => (
              <button
                key={l.id}
                onClick={() => select(l)}
                className={clsx(
                  "flex w-full items-center gap-3 border-b border-stone-100 px-4 py-3 text-left hover:bg-emerald-50",
                  draft?.id === l.id && "bg-emerald-50"
                )}
              >
                <span className={clsx("h-3 w-3 flex-none rounded-full", l.coordsVerified ? "bg-emerald-600" : "bg-amber-500")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900">{l.name}</p>
                  <p className="truncate text-xs text-stone-400">
                    {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
                  </p>
                </div>
                {!l.coordsVerified && <span className="text-xs text-amber-700">ค่าประมาณ</span>}
              </button>
            ))}
          </div>

          {draft && (
            <div className="flex flex-none flex-col gap-3 border-t border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">{draft.id ? "แก้ไขสถานที่" : "เพิ่มสถานที่ใหม่"}</p>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="ชื่อสถานที่"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                value={draft.detail}
                onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
                placeholder="รายละเอียด (ไม่บังคับ)"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={draft.lat}
                  onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
                  inputMode="decimal"
                  aria-label="ละติจูด"
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <input
                  value={draft.lng}
                  onChange={(e) => setDraft({ ...draft, lng: e.target.value })}
                  inputMode="decimal"
                  aria-label="ลองจิจูด"
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-stone-500">ลากหมุดสีน้ำเงินบนแผนที่ หรือคลิกตำแหน่งที่ถูกต้อง เพื่อย้ายพิกัด</p>
              {farKm > FAR_FROM_CAMPUS_KM && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  พิกัดนี้อยู่ห่างจากมหาวิทยาลัย {farKm.toFixed(1)} กม. ตรวจให้แน่ใจว่าถูกต้อง เพราะมีผลกับค่าโดยสาร
                </p>
              )}
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={draft.coordsVerified}
                  onChange={(e) => setDraft({ ...draft, coordsVerified: e.target.checked })}
                />
                ยืนยันว่าพิกัดตรงกับสถานที่จริงแล้ว
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={draft.isPopular}
                  onChange={(e) => setDraft({ ...draft, isPopular: e.target.checked })}
                />
                แสดงเป็นสถานที่ยอดนิยม
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving || !validPos} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} บันทึก
                </Button>
                {draft.id && (
                  <Button variant="danger" onClick={remove} disabled={saving}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  ปิด
                </Button>
              </div>
            </div>
          )}
          {!draft && error && <p className="p-4 text-sm text-red-600">{error}</p>}
        </aside>

        {/* ---- แผนที่ ---- */}
        <div className="relative isolate min-h-[24rem]">
          <MapContainer center={CAMPUS_CENTER} zoom={16} style={{ position: "absolute", inset: 0 }} zoomControl>
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              maxZoom={19}
            />
            {(landmarks ?? [])
              .filter((l) => l.id !== draft?.id)
              .map((l) => (
                <Marker
                  key={l.id}
                  position={[l.lat, l.lng]}
                  icon={l.coordsVerified ? ICON_VERIFIED : ICON_ESTIMATED}
                  title={l.name}
                  eventHandlers={{ click: () => select(l) }}
                />
              ))}
            {validPos && (
              <Marker
                position={draftPos}
                icon={ICON_SELECTED}
                draggable
                zIndexOffset={1000}
                eventHandlers={{ dragend: (e) => place(e.target.getLatLng().lat, e.target.getLatLng().lng) }}
              />
            )}
            <FlyTo position={validPos ? draftPos : null} flyKey={flyKey} />
            <ClickToPlace enabled={Boolean(draft)} onPlace={place} />
          </MapContainer>

          <div className="absolute bottom-6 left-4 z-[1000] flex items-center gap-4 rounded-lg bg-white/95 px-3 py-2 text-xs text-stone-600 shadow">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-600" /> ตรวจแล้ว
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-500" /> ค่าประมาณ
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-blue-600" /> กำลังแก้ไข
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
