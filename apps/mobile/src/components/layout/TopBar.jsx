import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import clsx from "clsx";

export default function TopBar({ title, onBack, transparent = false, dark = false, right }) {
  const navigate = useNavigate();
  return (
    <div
      className={clsx(
        "flex h-14 flex-none items-center gap-3 px-5",
        transparent ? "bg-transparent" : dark ? "bg-slate-900" : "bg-white",
        dark && "text-white"
      )}
    >
      {onBack !== null && (
        <button
          onClick={onBack ?? (() => navigate(-1))}
          className={clsx(
            "-ml-2 flex h-9 w-9 items-center justify-center rounded-full",
            dark ? "bg-white/10 active:bg-white/20" : "bg-slate-100 active:bg-slate-200"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {title && <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>}
      {right}
    </div>
  );
}
