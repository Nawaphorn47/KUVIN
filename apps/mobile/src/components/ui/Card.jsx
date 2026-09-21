import clsx from "clsx";

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx("rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-100", className)}
      {...props}
    >
      {children}
    </div>
  );
}
