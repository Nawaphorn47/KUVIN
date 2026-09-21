import clsx from "clsx";

export default function Avatar({ initial = "?", size = "md", className }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-xl",
    xl: "h-24 w-24 text-3xl",
  };
  return (
    <span
      className={clsx(
        "inline-flex flex-none items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700",
        sizes[size],
        className
      )}
    >
      {initial}
    </span>
  );
}
