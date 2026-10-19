import { motion } from "framer-motion";
import clsx from "clsx";

// ปุ่มแบบแผ่นป้าย: สีแบรนด์ของพื้นที่ ตัวหนา มุมโค้งเล็กน้อย กดแล้วยุบแบบสปริง
// disabled ไม่ใช้ opacity (ตัวอักษรจะจางจนอ่านไม่ออกกลางแดด) แต่เปลี่ยนเป็นพื้นอ่อนตัวเข้มแทน
const variants = {
  primary: "bg-brand-600 text-white shadow-sticker active:bg-brand-700 disabled:bg-brand-100 disabled:text-brand-800 disabled:shadow-none",
  secondary: "bg-brand-100 text-brand-800 active:bg-brand-200 disabled:bg-slate-100 disabled:text-slate-500",
  outline: "border-2 border-brand-600 bg-white text-brand-700 active:bg-brand-50 disabled:border-slate-300 disabled:text-slate-500",
  ghost: "text-slate-600 active:bg-slate-100 disabled:text-slate-400",
  danger: "bg-here text-white shadow-sticker active:brightness-90 disabled:bg-here-soft disabled:text-here disabled:shadow-none",
  dark: "bg-slate-900 text-white active:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-600",
};

const sizes = {
  md: "h-12 px-4 text-[15px]",
  lg: "h-14 px-6 text-[17px]",
};

export default function Button({
  as: Component = motion.button,
  variant = "primary",
  size = "lg",
  className,
  children,
  ...props
}) {
  return (
    <Component
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 26 }}
      className={clsx(
        "inline-flex w-full items-center justify-center gap-2 rounded-xl font-bold tracking-tight transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
