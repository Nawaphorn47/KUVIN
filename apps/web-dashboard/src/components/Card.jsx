import clsx from "clsx";

export default function Card({ className, children, ...props }) {
  return (
    <div className={clsx("rounded-xl border border-stone-200 bg-white shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}
