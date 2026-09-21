import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import clsx from "clsx";
import { CAMPUS_CENTER } from "../../lib/geo";

// หมุดวาดด้วย divIcon (HTML/Tailwind) ไม่ใช้รูป marker เริ่มต้นของ Leaflet ที่พังกับ bundler
const dot = (color, size = 16) =>
  L.divIcon({
    className: "",
    iconSize: [size + 12, size + 12],
    iconAnchor: [(size + 12) / 2, (size + 12) / 2],
    html: `<div style="width:${size + 12}px;height:${size + 12}px" class="flex items-center justify-center"><div style="width:${size}px;height:${size}px" class="rounded-full border-[3px] border-white ${color} shadow-md"></div></div>`,
  });

const ICONS = {
  pickup: dot("bg-emerald-500"),
  destination: L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div class="flex h-7 w-7 items-center justify-center"><div class="h-4 w-4 rounded-sm border-[3px] border-white bg-slate-900 shadow-md"></div></div>`,
  }),
  driver: L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 shadow-lg ring-4 ring-emerald-400/40"><svg viewBox="0 0 24 24" class="h-4 w-4 text-white" fill="currentColor"><path d="M12 2 4.5 20.3 12 16.5l7.5 3.8z"/></svg></div>`,
  }),
  me: dot("bg-blue-500", 14),
};

const key3 = (points) => points.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join("|");

// ปรับมุมมองให้เห็นทุกจุดใน `points` — หยุดปรับเองอัตโนมัติเมื่อผู้ใช้ลาก/ซูมแผนที่เอง กันแย่งการควบคุมกับผู้ใช้
function AutoFit({ points }) {
  const map = useMap();
  const auto = useRef(true);
  useMapEvents({
    dragstart: () => {
      auto.current = false;
    },
    zoomstart: (e) => {
      // zoom ที่เกิดจาก fitBounds/setView เองไม่นับ (ไม่มี originalEvent)
      if (e.originalEvent) auto.current = false;
    },
  });

  const key = key3(points);
  useEffect(() => {
    if (!auto.current || points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 16, { animate: false });
    else map.fitBounds(L.latLngBounds(points), { padding: [44, 44], maxZoom: 17, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

// แจ้งตำแหน่งกึ่งกลางแผนที่ทุกครั้งที่ผู้ใช้เลื่อนจบ (ใช้กับหน้า "ปักหมุดบนแผนที่")
function CenterWatcher({ onCenterChange }) {
  // dragend ด้วย: moveend หลังลากจะรอ animation แรงเฉื่อยจบก่อน (ถ้าแอปถูกพัก/ไม่ได้วาดหน้าจอ ค่าจะไม่อัปเดต)
  // ทำให้กดยืนยันทันทีหลังปล่อยนิ้วอาจได้ตำแหน่งเก่า — moveend ยังอยู่เพื่อปรับค่าให้ตรงหลังแรงเฉื่อยหยุด
  const map = useMapEvents({
    dragend: () => report(),
    moveend: () => report(),
  });
  function report() {
    const c = map.getCenter();
    onCenterChange({ lat: c.lat, lng: c.lng });
  }
  return null;
}

/**
 * แผนที่จริง (Leaflet + OpenStreetMap)
 *  - pickup / destination / driver / me : { lat, lng } | null
 *  - route : [[lat, lng], ...] เส้นทางที่จะวาด
 *  - fit : รายการจุด [lat, lng] ที่ต้องเห็นทั้งหมด (ไม่ส่ง = รวมหมุดทุกตัวที่มี)
 *  - interactive : เปิดให้ลาก/ซูมแผนที่ (ปิดไว้ในแผนที่ย่อที่อยู่ในหน้าเลื่อน กันนิ้วเลื่อนหน้าแล้วไปลากแผนที่แทน)
 *  - onPickupChange : ส่งมา = ลากหมุดจุดรับเพื่อปรับตำแหน่งได้
 *  - onCenterChange : รับตำแหน่งกึ่งกลางแผนที่ (ใช้กับหมุดปักกลางจอ)
 *  - children : overlay ที่วางทับแผนที่ (ปุ่ม/ข้อความ) — เฉพาะ button/a ที่รับการกด ส่วนอื่นปล่อยให้แผนที่รับนิ้วผ่านไป
 */
export default function MapView({
  pickup,
  destination,
  driver,
  me,
  route,
  fit,
  height = "h-56",
  className,
  interactive = false,
  onPickupChange,
  onCenterChange,
  children,
}) {
  const fitPoints = useMemo(() => {
    if (fit) return fit.filter(Boolean);
    return [pickup, destination, driver, me].filter(Boolean).map((p) => [p.lat, p.lng]);
  }, [fit, pickup, destination, driver, me]);

  const initialCenter = fitPoints[0] ?? [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng];

  return (
    <div className={clsx("relative isolate w-full overflow-hidden rounded-2xl bg-emerald-50", height, className)}>
      <MapContainer
        center={initialCenter}
        zoom={16}
        // absolute แทน h-full: กรอบที่สูงเพราะ flex-1 ไม่มีความสูงที่ "แน่นอน" ให้ h-full อ้างอิง ทำให้แผนที่สูง 0
        style={{ position: "absolute", inset: 0 }}
        zoomControl={false}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        {route?.length > 1 && (
          <>
            <Polyline positions={route} pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.9 }} />
            <Polyline positions={route} pathOptions={{ color: "#059669", weight: 5, opacity: 1 }} />
          </>
        )}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={ICONS.destination} interactive={false} />}
        {pickup && (
          <Marker
            position={[pickup.lat, pickup.lng]}
            icon={ICONS.pickup}
            draggable={Boolean(onPickupChange)}
            interactive={Boolean(onPickupChange)}
            eventHandlers={
              onPickupChange
                ? { dragend: (e) => onPickupChange({ lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }) }
                : undefined
            }
          />
        )}
        {me && <Marker position={[me.lat, me.lng]} icon={ICONS.me} interactive={false} />}
        {driver && <Marker position={[driver.lat, driver.lng]} icon={ICONS.driver} interactive={false} zIndexOffset={1000} />}
        <AutoFit points={fitPoints} />
        {onCenterChange && <CenterWatcher onCenterChange={onCenterChange} />}
      </MapContainer>

      {children && (
        <div className="pointer-events-none absolute inset-0 z-[1000] [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
}
