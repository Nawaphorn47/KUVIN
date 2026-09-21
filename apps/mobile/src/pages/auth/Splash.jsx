import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bike } from "lucide-react";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/onboarding"), 1600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gradient-to-b from-emerald-600 to-emerald-800 px-8 text-center text-white">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur"
      >
        <Bike className="h-10 w-10" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h1 className="text-4xl font-bold tracking-tight">KU VIN</h1>
        <p className="mt-1 text-sm text-emerald-100">บริการวินมอเตอร์ไซค์ภายในมหาวิทยาลัย</p>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-14 text-sm font-medium text-emerald-100"
      >
        มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน
      </motion.p>
    </div>
  );
}
