import clsx from "clsx";

const variants = {
  primary: "bg-emerald-800 text-white hover:bg-emerald-900 active:bg-emerald-950",
  outline: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 active:bg-stone-100",
  ghost: "bg-transparent text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100",
  danger: "bg-red-700 text-white hover:bg-red-800 active:bg-red-900",
};

const sizes = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-1.5 text-sm",
};

export default function Button({ variant = "primary", size = "md", className, children, ...props }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
