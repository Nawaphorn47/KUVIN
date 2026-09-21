import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import MapView from "../../components/shared/MapView";
import { useApp } from "../../context/AppContext";
import { CAMPUS_CENTER } from "../../lib/geo";

// เลือกปลายทางด้วยการเลื่อนแผนที่ให้หมุดกลางจอตรงจุดที่ต้องการ (แบบแอปเรียกรถทั่วไป) — ใช้กับที่ที่ไม่อยู่ในรายชื่อสถานที่
export default function PickOnMap() {
  const navigate = useNavigate();
  const { setBooking } = useApp();
  const [center, setCenter] = useState(CAMPUS_CENTER);

  function confirm() {
    setBooking((b) => ({
      ...b,
      destination: { lat: center.lat, lng: center.lng, name: "จุดที่ปักหมุดบนแผนที่" },
    }));
    navigate("/confirm-booking");
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="ปักหมุดปลายทาง" />
      <MapView
        height="flex-1"
        className="min-h-[24rem] rounded-none"
        fit={[[CAMPUS_CENTER.lat, CAMPUS_CENTER.lng]]}
        interactive
        onCenterChange={setCenter}
      >
        {/* หมุดตรึงกลางจอ — ปลายหมุดชี้จุดกึ่งกลางแผนที่พอดี */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <MapPin className="h-10 w-10 fill-slate-900 text-white drop-shadow-lg" />
        </div>
      </MapView>
      <div className="flex flex-col gap-3 border-t border-slate-100 bg-white p-5">
        <p className="text-center text-xs text-slate-400">เลื่อนแผนที่ให้หมุดอยู่ตรงจุดที่ต้องการไปส่ง</p>
        <Button onClick={confirm}>ยืนยันจุดหมายนี้</Button>
      </div>
    </div>
  );
}
