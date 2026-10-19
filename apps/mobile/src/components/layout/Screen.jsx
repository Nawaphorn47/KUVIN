import { motion } from "framer-motion";
import clsx from "clsx";

// พื้นหลังหน้าจอเป็นเทาอมเขียวอ่อนของแผ่นป้าย ข้อมูลวางบนแผ่นขาว (Card) — dark ยังรองรับหน้าเก่า
export default function Screen({ children, className, padded = true, dark = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        "no-scrollbar flex flex-1 flex-col overflow-y-auto",
        dark ? "bg-slate-900 text-white" : "bg-slate-50",
        padded && "px-4 pb-6 pt-4",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
