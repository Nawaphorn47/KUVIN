import { useNavigate } from "react-router-dom";
import { CheckCircle2, Power } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";

export default function VerificationSuccess() {
  const navigate = useNavigate();
  const { setMode } = useApp();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-emerald-50 px-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 15 }}
        className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-500 text-white shadow-card"
      >
        <CheckCircle2 className="h-14 w-14" />
      </motion.div>

      <div>
        <h1 className="text-2xl text-emerald-800">ยืนยันตัวตนสำเร็จ!</h1>
        <p className="mt-2 text-base text-slate-600">
          คุณสามารถเริ่มรับงานและหารายได้กับ KU-VIN ได้แล้ววันนี้
        </p>
      </div>

      <Card className="flex w-full items-center gap-4 text-left shadow-card ring-emerald-100">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Power className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <p className="text-xl text-slate-900">เปิดระบบรับงานได้ทันที</p>
          <p className="text-xs text-slate-500">ระบบของคุณพร้อมให้บริการแล้ว</p>
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white">
          <CheckCircle2 className="h-4 w-4" />
        </span>
      </Card>

      <div className="flex w-full flex-col gap-3">
        <Button
          onClick={() => {
            setMode("driver");
            navigate("/driver/home");
          }}
        >
          เริ่มรับงานเลย
        </Button>
        <Button variant="outline" onClick={() => navigate("/driver/profile")}>
          กลับหน้าหลัก
        </Button>
      </div>
    </div>
  );
}
