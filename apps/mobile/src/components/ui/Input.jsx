import { useId } from "react";
import clsx from "clsx";

export default function Input({ label, icon: Icon, className, id, ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <span className="relative flex items-center">
        {Icon && <Icon aria-hidden="true" className="pointer-events-none absolute left-4 h-5 w-5 text-slate-500" />}
        <input
          id={inputId}
          className={clsx(
            "h-[3.25rem] w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500",
            Icon && "pl-11",
            className
          )}
          {...props}
        />
      </span>
    </div>
  );
}
