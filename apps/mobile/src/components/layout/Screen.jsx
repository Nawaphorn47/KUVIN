import { motion } from "framer-motion";
import clsx from "clsx";

export default function Screen({ children, className, padded = true, dark = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={clsx(
        "no-scrollbar flex flex-1 flex-col overflow-y-auto",
        dark ? "bg-slate-900 text-white" : "bg-white",
        padded && "px-5 pb-6 pt-4",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
