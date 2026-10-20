import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import StopNumber from "../../components/ui/StopNumber";

// หน้าต้อนรับหน้าเดียว (เดิมมีจุดบอกว่ามี 3 หน้าแต่มีหน้าเดียว) — อธิบายแนวคิดของแอปด้วยแผนผังจำลอง:
// เลขปลายทาง + จุดแดง "คุณอยู่ที่นี่" แล้วไปเข้าสู่ระบบ
export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-brand-600 text-white">
      <main className="flex min-h-0 flex-1 flex-col justify-center px-6">
        {/* แผนผังจำลอง: ไม่ใช่แผนที่จริง ใช้เล่าว่าแอปทำงานอย่างไร */}
        <div aria-hidden="true" className="relative mx-auto h-52 w-full max-w-xs overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/25">
          <span className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white/60 bg-white/15" />
          <span className="absolute left-[22%] top-[24%]"><StopNumber n={1} className="border-white" /></span>
          <span className="absolute left-[62%] top-[18%]"><StopNumber n={2} selected className="border-white" /></span>
          <span className="absolute left-[70%] top-[58%]"><StopNumber n={3} className="border-white" /></span>
          <span className="absolute left-[34%] top-[62%] flex flex-col items-center gap-1">
            <span className="h-4 w-4 rounded-full border-[3px] border-white bg-here" />
            <span className="rounded bg-here px-1.5 py-0.5 text-[11px] font-bold">คุณอยู่ที่นี่</span>
          </span>
        </div>

        <h1 className="mt-8 text-[2rem] font-bold leading-tight tracking-tight">เรียกวิน แตะเลขเดียวก็ไป</h1>
        <p className="mt-2 text-base text-brand-100">
          เห็นราคาก่อนกดทุกครั้ง บัญชีเดียวทั้งเรียกวินและขับวิน ใช้ได้ทุกพื้นที่ที่มี KUVIN
        </p>
      </main>

      <div className="flex flex-none flex-col gap-1 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Button onClick={() => navigate("/login")} className="!bg-white !text-brand-800">
          เริ่มต้นใช้งาน
        </Button>
      </div>
    </div>
  );
}
