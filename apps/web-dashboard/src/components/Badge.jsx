import clsx from "clsx";

const tones = {
  success: "bg-emerald-100 text-emerald-800",
  danger: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-blue-100 text-blue-700",
  neutral: "bg-stone-200 text-stone-700",
};

const sizes = {
  md: "px-3 py-1 text-sm",
  sm: "px-2 py-0.5 text-xs",
};

export default function Badge({ tone = "success", size = "md", className, children }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full font-medium", sizes[size], tones[tone], className)}>
      {children}
    </span>
  );
}
