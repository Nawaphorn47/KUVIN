import { useNavigate, useLocation } from "react-router-dom";
import { ImageOff, XCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import StatusScreen from "../../components/shared/StatusScreen";

export default function VerificationRejected() {
  const navigate = useNavigate();
  const location = useLocation();
  const reason = location.state?.reason || "แอดมินไม่ได้ระบุเหตุผล ติดต่อแอดมินของวิทยาเขตเพื่อสอบถาม";

  return (
    <StatusScreen
      tone="bad"
      icon={XCircle}
      title="เอกสารยังไม่ผ่าน"
      text="แก้ตามเหตุผลด้านล่างแล้วส่งใหม่ได้เลย"
      actions={
        <>
          <Button onClick={() => navigate("/driver/verify/step-1")}>แก้ไขและส่งใหม่</Button>
          <Button variant="ghost" onClick={() => navigate("/driver/profile")}>
            กลับไปหน้าบัญชี
          </Button>
        </>
      }
    >
      <section aria-label="เหตุผลที่ไม่ผ่าน" className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-600">เหตุผลจากแอดมิน</h2>
        <p className="mt-1 text-lg font-bold text-slate-900">{reason}</p>
        <p className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
          <ImageOff className="h-4 w-4 flex-none" aria-hidden="true" /> ถ่ายในที่สว่างและให้ตัวอักษรชัด ส่งเฉพาะใบที่ต้องแก้ใหม่ก็ได้
        </p>
      </section>
    </StatusScreen>
  );
}
