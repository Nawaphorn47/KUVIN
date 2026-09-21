import { useNavigate } from "react-router-dom";
import { MapPinned } from "lucide-react";
import Button from "../../components/ui/Button";

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-emerald-700 to-emerald-900 px-6 pb-10 pt-6 text-white">
      <button
        onClick={() => navigate("/login")}
        className="self-end text-sm font-medium text-emerald-100"
      >
        ข้ามไปก่อน
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-40 w-40 items-center justify-center rounded-full bg-white/10">
          <MapPinned className="h-16 w-16 text-emerald-200" />
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-snug">
            เรียกวินได้ทุกที่
            <br />
            ในมหาวิทยาลัย
          </h2>
          <p className="mt-3 text-base text-emerald-100">
            เลือกจุดรับ-ส่งบนแผนที่ได้เลย ครอบคลุมทุกพื้นที่ใน มก.กำแพงแสน
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-2 pb-6">
        <span className="h-1.5 w-6 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
      </div>

      <Button variant="secondary" onClick={() => navigate("/login")}>
        ถัดไป
      </Button>
    </div>
  );
}
