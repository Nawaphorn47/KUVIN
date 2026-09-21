import { motion } from "framer-motion";
import clsx from "clsx";

const variants = {
  primary: "bg-emerald-600 text-white shadow-floating active:bg-emerald-700",
  secondary: "bg-emerald-50 text-emerald-700 active:bg-emerald-100",
  outline: "border-2 border-emerald-600 text-emerald-700 bg-white active:bg-emerald-50",
  ghost: "text-slate-500 active:text-slate-700",
  danger: "bg-red-600 text-white shadow-floating active:bg-red-700",
  dark: "bg-slate-900 text-white active:bg-slate-800",
};

const sizes = {
  md: "h-12 px-4 text-sm",
  lg: "h-14 px-6 text-base",
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
      whileTap={{ scale: 0.97 }}
      className={clsx(
        "inline-flex w-full items-center justify-center gap-2 rounded-2xl font-semibold transition-colors disabled:opacity-50",
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
