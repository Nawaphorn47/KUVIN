import { useNavigate, useLocation } from "react-router-dom";
import { XCircle, AlertTriangle, ImageOff } from "lucide-react";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";

export default function VerificationRejected() {
  const navigate = useNavigate();
  const location = useLocation();
  const reason = location.state?.reason || "รูปบัตรประชาชนไม่ชัดเจน กรุณาอัพโหลดใหม่";

  return (
    <div className="flex flex-1 flex-col bg-emerald-50">
      <TopBar title="ยืนยันตัวตนคนขับ" onBack={() => navigate("/driver/profile")} />
      <div className="flex flex-1 flex-col items-center gap-6 px-6 pt-8 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-rose-100">
          <XCircle className="h-9 w-9 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl text-slate-900">ข้อมูลไม่ผ่านการตรวจสอบ</h1>
          <p className="mt-2 text-base text-slate-500">
            ขออภัย ระบบไม่สามารถยืนยันข้อมูลของคุณได้ โปรดตรวจสอบสาเหตุด้านล่าง
          </p>
        </div>

        <div className="w-full rounded-xl border border-rose-200 bg-white p-5 text-left shadow-card">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-none text-red-600" />
            <div>
              <p className="text-xs text-red-600">สาเหตุที่ปฏิเสธ</p>
              <p className="text-base text-slate-900">{reason}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <ImageOff className="h-3.5 w-3.5" />
            กรุณาใช้แสงสว่างที่เพียงพอและตรวจสอบความคมชัด
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-5 pb-10">
        <Button onClick={() => navigate("/driver/verify/step-1")}>แก้ไขข้อมูล</Button>
        <p className="text-center text-xs text-slate-500">หากมีข้อสงสัย ติดต่อศูนย์ช่วยเหลือคนขับ</p>
      </div>
    </div>
  );
}
