import { useNavigate } from "react-router-dom";
import { Clock, Info } from "lucide-react";
import TopBar from "../../components/layout/TopBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

export default function VerificationPending() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col bg-emerald-50">
      <TopBar title="ยืนยันตัวตนคนขับ" onBack={() => navigate("/driver/profile")} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-card">
          <span className="absolute inset-0 rounded-full bg-amber-400/15" />
          <Clock className="h-14 w-14 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl text-slate-900">ข้อมูลของคุณอยู่ระหว่างการตรวจสอบ</h1>
          <p className="mt-2 text-base text-slate-500">แอดมินจะตรวจสอบและแจ้งผลภายใน 24 ชม.</p>
        </div>

        <Card className="flex items-start gap-4 text-left shadow-card">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-slate-500">ขั้นตอนถัดไป</p>
            <p className="text-base text-slate-900">
              หลังจากตรวจสอบสำเร็จ คุณจะสามารถเริ่มรับงานได้ทันที
            </p>
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <span className="h-1.5 w-12 rounded-full bg-emerald-700" />
          <span className="h-1.5 w-4 rounded-full bg-emerald-700/20" />
          <span className="h-1.5 w-4 rounded-full bg-emerald-700/20" />
        </div>
      </div>
      <div className="p-5 pb-10">
        <Button variant="outline" onClick={() => navigate("/driver/profile")}>
          กลับหน้าหลัก
        </Button>
      </div>
    </div>
  );
}
