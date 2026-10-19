import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import Button from "../../components/ui/Button";
import StatusScreen from "../../components/shared/StatusScreen";

export default function VerificationPending() {
  const navigate = useNavigate();
  return (
    <StatusScreen
      icon={Clock}
      title="ส่งเอกสารแล้ว รอแอดมินตรวจ"
      text="ตรวจผ่านเมื่อไหร่ก็เริ่มรับงานได้ทันที"
      actions={<Button variant="outline" onClick={() => navigate("/driver/profile")}>กลับไปหน้าบัญชี</Button>}
    >
      <ol className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        {[
          ["ส่งเอกสารแล้ว", "done"],
          ["แอดมินของพื้นที่ตรวจเอกสาร", "now"],
          ["เริ่มรับงานได้", "next"],
        ].map(([label, state]) => (
          <li key={label} className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 last:border-b-0">
            <span
              aria-hidden="true"
              className={
                state === "done"
                  ? "h-4 w-4 rounded-full bg-brand-600"
                  : state === "now"
                    ? "h-4 w-4 rounded-full border-[3px] border-brand-600 bg-white"
                    : "h-4 w-4 rounded-full border-2 border-slate-300 bg-white"
              }
            />
            <span className={state === "next" ? "text-[15px] text-slate-500" : "text-[15px] font-bold text-slate-900"}>{label}</span>
            {state === "now" && <span className="ml-auto text-sm font-semibold text-brand-700">กำลังตรวจ</span>}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-slate-600">ระหว่างรอ คุณยังเรียกวินเป็นผู้โดยสารได้ด้วยบัญชีเดียวกัน สลับโหมดได้ที่หน้าบัญชี</p>
    </StatusScreen>
  );
}
