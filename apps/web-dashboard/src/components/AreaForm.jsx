import { useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, Check, ImagePlus, Loader2, Phone, Plus, Trash2 } from "lucide-react";
import Button from "./Button";
import { api } from "../services/api";

// ฟอร์มตั้งค่าพื้นที่ — ใช้ทั้งตอนสร้างพื้นที่ใหม่ (super) และแก้พื้นที่ (แอดมินพื้นที่/ super)
// ค่าทั้งหมดตรงกับ model Area ใน apps/api/prisma/schema.prisma และตรวจซ้ำที่ area.service.js

const CENTER_ICON = L.divIcon({
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: '<div style="width:28px;height:28px" class="flex items-center justify-center"><div style="width:18px;height:18px" class="rounded-full border-[3px] border-white bg-emerald-700 shadow ring-4 ring-emerald-300/60"></div></div>',
});

export const blankArea = () => ({
  slug: "",
  name: "",
  displayName: "",
  logoUrl: "",
  centerLat: 14.023,
  centerLng: 99.9739,
  flatRadiusKm: 2,
  serviceRadiusKm: 15,
  flatFare: 20,
  ratePerKm: 10,
  minFare: 20,
  emergencyContacts: [{ label: "", phone: "" }],
  isActive: true,
});

export const toForm = (a) => ({
  slug: a.slug,
  name: a.name,
  displayName: a.displayName,
  logoUrl: a.logoUrl ?? "",
  centerLat: a.centerLat,
  centerLng: a.centerLng,
  flatRadiusKm: a.flatRadiusKm,
  serviceRadiusKm: a.serviceRadiusKm,
  flatFare: a.flatFare,
  ratePerKm: a.ratePerKm,
  minFare: a.minFare,
  emergencyContacts: Array.isArray(a.emergencyContacts) ? a.emergencyContacts : [],
  isActive: a.isActive,
});

function MapClick({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ซูมให้เห็นวงรัศมีให้บริการทั้งวงเมื่อรัศมีหรือจุดกลางเปลี่ยนจากการพิมพ์
function FitCircle({ center, radiusKm }) {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !(radiusKm > 0)) return;
    map.fitBounds(L.latLng(center).toBounds(radiusKm * 2000), { padding: [20, 20], animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm]);
  return null;
}

export default function AreaForm({ initial, mode, canManage, onSubmit, submitLabel = "บันทึก" }) {
  // mode: "create" | "edit"; canManage = super admin (แก้รหัสพื้นที่/เปิดปิดพื้นที่ได้)
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const set = (patch) => {
    setSaved(false);
    setForm((f) => ({ ...f, ...patch }));
  };
  const center = [Number(form.centerLat), Number(form.centerLng)];
  const validCenter = Number.isFinite(center[0]) && Number.isFinite(center[1]);

  function setContact(i, patch) {
    set({ emergencyContacts: form.emergencyContacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  }

  async function uploadLogo(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.post("/uploads", body);
      set({ logoUrl: data.url });
    } catch (err) {
      setError(err.response?.data?.message || "อัปโหลดโลโก้ไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        ...form,
        // แถวเบอร์ฉุกเฉินที่เว้นว่างทั้งแถว = ไม่ใช้ ตัดทิ้งก่อนส่ง
        emergencyContacts: form.emergencyContacts.filter((c) => c.label.trim() || c.phone.trim()),
      };
      if (mode === "edit" && !canManage) {
        delete body.slug;
        delete body.isActive;
      }
      await onSubmit(body);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  // ตัวอย่างค่าโดยสาร (สูตรเดียวกับ calculateFare ใน apps/api/src/utils/geo.js)
  const sample = (km) => Math.max(Number(form.minFare) || 0, Math.round(km * (Number(form.ratePerKm) || 0)));

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Section title="ชื่อและโลโก้" hint="แสดงในแอปผู้โดยสาร/คนขับ ตอนเลือกพื้นที่และบนหัวหน้าจอ">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 text-stone-400 hover:border-emerald-600"
              title="อัปโหลดโลโก้"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : form.logoUrl ? (
                <img src={form.logoUrl} alt="โลโก้" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => uploadLogo(e.target.files?.[0])}
            />
            <div className="flex-1 text-xs text-stone-500">
              <p>รูปสี่เหลี่ยมจัตุรัส PNG/JPG/WEBP ไม่เกิน 5 MB</p>
              {form.logoUrl && (
                <button type="button" onClick={() => set({ logoUrl: "" })} className="mt-1 text-red-700 hover:underline">
                  ลบโลโก้
                </button>
              )}
            </div>
          </div>
          <Field label="ชื่อเต็มของพื้นที่" hint="เช่น มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน">
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ชื่อสั้นที่แสดงในแอป" hint="ไม่เกิน 40 ตัวอักษร">
              <input
                value={form.displayName}
                onChange={(e) => set({ displayName: e.target.value })}
                maxLength={40}
                className={inputCls}
                required
              />
            </Field>
            <Field label="รหัสพื้นที่ (slug)" hint={canManage ? "a-z 0-9 และ - เช่น ku-kps" : "แก้ได้เฉพาะ super admin"}>
              <input
                value={form.slug}
                onChange={(e) => set({ slug: e.target.value.toLowerCase() })}
                disabled={!canManage}
                className={inputCls}
                required
              />
            </Field>
          </div>
          {canManage && (
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
              เปิดให้บริการ (ปิด = ผู้โดยสารเลือกพื้นที่นี้ไม่ได้ และเรียกวินในพื้นที่นี้ไม่ได้)
            </label>
          )}
        </Section>

        <Section title="ค่าโดยสาร" hint="ทริปที่จุดรับและปลายทางอยู่ในเขตเหมาจ่ายคิดราคาเดียว นอกเขตคิดตามระยะทาง">
          <div className="grid grid-cols-3 gap-3">
            <Field label="เหมาจ่ายในเขต (บาท)">
              <input type="number" min="0" step="any" value={form.flatFare} onChange={(e) => set({ flatFare: e.target.value })} className={inputCls} />
            </Field>
            <Field label="นอกเขต (บาท/กม.)">
              <input type="number" min="0" step="any" value={form.ratePerKm} onChange={(e) => set({ ratePerKm: e.target.value })} className={inputCls} />
            </Field>
            <Field label="ขั้นต่ำนอกเขต (บาท)">
              <input type="number" min="0" step="any" value={form.minFare} onChange={(e) => set({ minFare: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            ตัวอย่าง: ในเขต {form.flatFare || 0} ฿ · นอกเขต 3 กม. = {sample(3)} ฿ · 5 กม. = {sample(5)} ฿ · 10 กม. = {sample(10)} ฿
          </p>
        </Section>

        <Section title="เบอร์ฉุกเฉินของพื้นที่" hint="แสดงในปุ่ม SOS และหน้าตั้งค่า (เบอร์ 191 และ 1669 แอปใส่ให้อัตโนมัติอยู่แล้ว)">
          {form.emergencyContacts.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c.label}
                onChange={(e) => setContact(i, { label: e.target.value })}
                placeholder="ชื่อ เช่น รปภ. มหาวิทยาลัย"
                maxLength={60}
                className={`${inputCls} flex-1`}
              />
              <div className="relative w-40">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  value={c.phone}
                  onChange={(e) => setContact(i, { phone: e.target.value })}
                  placeholder="เบอร์โทร"
                  maxLength={20}
                  className={`${inputCls} pl-9`}
                />
              </div>
              <button
                type="button"
                onClick={() => set({ emergencyContacts: form.emergencyContacts.filter((_, j) => j !== i) })}
                className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-700"
                aria-label="ลบเบอร์นี้"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {form.emergencyContacts.length < 10 && (
            <button
              type="button"
              onClick={() => set({ emergencyContacts: [...form.emergencyContacts, { label: "", phone: "" }] })}
              className="flex items-center gap-1.5 self-start text-sm font-medium text-emerald-800 hover:underline"
            >
              <Plus className="h-4 w-4" /> เพิ่มเบอร์
            </button>
          )}
        </Section>
      </div>

      <div className="flex flex-col gap-6">
        <Section title="ขอบเขตพื้นที่" hint="คลิกบนแผนที่หรือลากหมุดเพื่อย้ายจุดกลาง วงเขียวเข้ม = เขตเหมาจ่าย วงเขียวอ่อน = ระยะที่วินไปรับได้">
          <div className="relative isolate h-80 overflow-hidden rounded-xl border border-stone-200">
            {validCenter && (
              <MapContainer center={center} zoom={13} style={{ position: "absolute", inset: 0 }}>
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  maxZoom={19}
                />
                <Circle
                  center={center}
                  radius={(Number(form.serviceRadiusKm) || 0) * 1000}
                  pathOptions={{ color: "#6ee7b7", fillColor: "#a7f3d0", fillOpacity: 0.15, weight: 2 }}
                />
                <Circle
                  center={center}
                  radius={(Number(form.flatRadiusKm) || 0) * 1000}
                  pathOptions={{ color: "#047857", fillColor: "#10b981", fillOpacity: 0.2, weight: 2 }}
                />
                <Marker
                  position={center}
                  icon={CENTER_ICON}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const p = e.target.getLatLng();
                      set({ centerLat: round6(p.lat), centerLng: round6(p.lng) });
                    },
                  }}
                />
                <MapClick onPick={(lat, lng) => set({ centerLat: round6(lat), centerLng: round6(lng) })} />
                <FitCircle center={center} radiusKm={Number(form.serviceRadiusKm)} />
              </MapContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ละติจูดจุดกลาง">
              <input value={form.centerLat} onChange={(e) => set({ centerLat: e.target.value })} inputMode="decimal" className={inputCls} />
            </Field>
            <Field label="ลองจิจูดจุดกลาง">
              <input value={form.centerLng} onChange={(e) => set({ centerLng: e.target.value })} inputMode="decimal" className={inputCls} />
            </Field>
            <Field label="รัศมีเขตเหมาจ่าย (กม.)">
              <input type="number" min="0.1" step="any" value={form.flatRadiusKm} onChange={(e) => set({ flatRadiusKm: e.target.value })} className={inputCls} />
            </Field>
            <Field label="รัศมีให้บริการ (กม.)">
              <input type="number" min="0.1" step="any" value={form.serviceRadiusKm} onChange={(e) => set({ serviceRadiusKm: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </Section>

        <div className="sticky bottom-0 flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          {error ? (
            <p className="flex flex-1 items-center gap-1.5 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-none" /> {error}
            </p>
          ) : saved ? (
            <p className="flex flex-1 items-center gap-1.5 text-sm text-emerald-700">
              <Check className="h-4 w-4" /> บันทึกแล้ว
            </p>
          ) : (
            <p className="flex-1 text-xs text-stone-500">การเปลี่ยนค่าโดยสารมีผลกับทริปที่เรียกหลังบันทึกเท่านั้น</p>
          )}
          <Button type="submit" disabled={saving || uploading} className="px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;
const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 disabled:bg-stone-100 disabled:text-stone-500";

function Section({ title, hint, children }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-emerald-900">{title}</h2>
        {hint && <p className="text-xs text-stone-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-stone-600">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
    </label>
  );
}
