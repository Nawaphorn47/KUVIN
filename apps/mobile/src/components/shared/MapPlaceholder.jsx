import { MapPin, Navigation } from "lucide-react";
import clsx from "clsx";

/**
 * Stylised campus-map backdrop used behind booking / tracking screens.
 * Not a real map integration — Leaflet + OSRM per the proposal will replace this.
 */
export default function MapPlaceholder({ className, height = "h-56", children }) {
  return (
    <div
      className={clsx(
        "relative w-full overflow-hidden rounded-2xl bg-emerald-50",
        height,
        className
      )}
    >
      <svg className="absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#a7f3d0" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <svg
        className="absolute left-[8%] top-[35%] h-[2px] w-[70%] -rotate-3 text-emerald-300"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="1" x2="100%" y2="1" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 10" />
      </svg>
      <MapPin className="absolute left-[10%] top-[28%] h-6 w-6 text-emerald-600 drop-shadow" />
      <Navigation className="absolute right-[14%] top-[55%] h-6 w-6 rotate-45 text-emerald-700 drop-shadow" />
      {children}
    </div>
  );
}
