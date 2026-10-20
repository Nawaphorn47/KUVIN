import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "../../components/ui/Logo";
import { useArea } from "../../context/AreaContext";

// หน้าเปิดแอป: สติกเกอร์เด้งเข้ามา ชื่อแอป และชื่อพื้นที่ที่ตรวจเจอ (แบรนด์สีเปลี่ยนตามพื้นที่)
export default function Splash() {
  const navigate = useNavigate();
  const { area } = useArea();

  useEffect(() => {
    const t = setTimeout(() => navigate("/onboarding", { replace: true }), 1600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 bg-brand-600 px-8 text-center text-white">
      <motion.span
        initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: -6, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
        className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-brand-700 shadow-floating"
        aria-hidden="true"
      >
        <Logo className="h-14 w-14" />
      </motion.span>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 className="text-5xl font-bold tracking-tight">KU VIN</h1>
        <p className="mt-2 text-base text-brand-100">เรียกวินมอเตอร์ไซค์ใกล้คุณ</p>
      </motion.div>
      {area && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="absolute bottom-14 text-sm font-semibold text-brand-100">
          {area.displayName}
        </motion.p>
      )}
    </div>
  );
}
