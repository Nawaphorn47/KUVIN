import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import MapView from "../../components/shared/MapView";
import { useApp } from "../../context/AppContext";
import { useArea } from "../../context/AreaContext";
import { areaCenter, distanceKm } from "../../lib/geo";

// เลือกปลายทางด้วยการเลื่อนแผนที่ให้หมุดกลางจอตรงจุดที่ต้องการ (แบบแอปเรียกรถทั่วไป) — ใช้กับที่ที่ไม่อยู่ในรายชื่อสถานที่
export default function PickOnMap() {
  const navigate = useNavigate();
  const { setBooking } = useApp();
  const { area } = useArea();
  const start = areaCenter(area); // เริ่มที่จุดกลางของวิทยาเขตที่เลือกอยู่
  const [center, setCenter] = useState(start);
  const inZone = area ? distanceKm(start, center) <= area.flatRadiusKm : true;

  function confirm() {
    setBooking((b) => ({
      ...b,
      destination: { lat: center.lat, lng: center.lng, name: "จุดที่ปักหมุดบนแผนที่" },
    }));
    navigate("/confirm-booking");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TopBar title="ปักหมุดปลายทาง" />
      <MapView
        height="flex-1"
        className="min-h-[20rem] rounded-none"
        fit={[[start.lat, start.lng]]}
        zone={area ? { ...start, radiusKm: area.flatRadiusKm } : null}
        interactive
        onCenterChange={setCenter}
      >
        {/* หมุดตรึงกลางจอ (เครื่องหมายปลายทางสี่เหลี่ยมเข้ม ชุดเดียวกับทุกแผนที่) — ปลายก้านชี้จุดกึ่งกลางพอดี */}
        <div aria-hidden="true" className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center">
          <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-floating">ส่งที่นี่</span>
          <span className="h-5 w-0.5 bg-slate-900" />
          <span className="-mt-0.5 h-2 w-2 rounded-full bg-slate-900 ring-2 ring-white" />
        </div>
      </MapView>
      <div className="flex flex-none flex-col gap-3 border-t border-slate-200 bg-white px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">ลากแผนที่ให้ก้านหมุดชี้ตรงจุดที่จะลง</p>
          {area && (
            <span className="tabular flex-none text-right text-sm font-bold text-slate-900">
              {inZone ? `${area.flatFare} ฿ เหมา` : `${area.ratePerKm} ฿/กม.`}
            </span>
          )}
        </div>
        <Button onClick={confirm}>ส่งที่จุดนี้</Button>
      </div>
    </div>
  );
}
