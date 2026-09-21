import { Star, Bike } from "lucide-react";
import Avatar from "../ui/Avatar";

export default function DriverInfoCard({ driver }) {
  const name = driver.fullName ?? driver.name;
  return (
    <div className="flex items-center gap-3">
      <Avatar initial={name[0]} size="lg" />
      <div className="flex-1">
        <p className="text-lg font-bold text-slate-900">{name}</p>
        {(driver.rating ?? driver.ratingAvg) != null && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-slate-700">{driver.rating ?? driver.ratingAvg}</span>
            {driver.totalTrips != null && <span>({driver.totalTrips.toLocaleString()} เที่ยว)</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
        <Bike className="h-5 w-5 text-slate-500" />
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-700">{driver.vehicleModel}</p>
          <p className="text-[11px] text-slate-400">{driver.vinNumber}</p>
        </div>
      </div>
    </div>
  );
}
