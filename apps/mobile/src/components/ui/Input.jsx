import clsx from "clsx";

export default function Input({ label, icon: Icon, className, ...props }) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <span className="relative flex items-center">
        {Icon && <Icon className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />}
        <input
          className={clsx(
            "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100",
            Icon && "pl-11",
            className
          )}
          {...props}
        />
      </span>
    </label>
  );
}
