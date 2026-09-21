import clsx from "clsx";

const variants = {
  primary: "bg-emerald-800 text-white hover:bg-emerald-900",
  ghost: "bg-transparent text-emerald-900 hover:bg-emerald-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export default function Button({ variant = "primary", className, children, ...props }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
