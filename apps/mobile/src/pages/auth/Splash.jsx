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
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <h1 className="sr-only">KUVIN</h1>
        <Logo variant="lockup" dark className="h-[17rem] w-auto" />
      </motion.div>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-base text-brand-100">
        เรียกวินมอเตอร์ไซค์ใกล้คุณ
      </motion.p>
      {area && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="absolute bottom-14 text-sm font-semibold text-brand-100">
          {area.displayName}
        </motion.p>
      )}
    </div>
  );
}
