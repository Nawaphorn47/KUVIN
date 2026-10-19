import { Star } from "lucide-react";
import Avatar from "../ui/Avatar";
import StopNumber from "../ui/StopNumber";

// ข้อมูลคนขับที่ผู้โดยสารใช้ "จับคู่กับของจริง" ตรงจุดรับ: เลขเสื้อวินเป็นสติกเกอร์ใหญ่ ป้ายทะเบียนเป็นกรอบแบบป้ายจริง
export default function DriverInfoCard({ driver }) {
  const name = driver.fullName ?? driver.name;
  const rating = driver.rating ?? driver.ratingAvg;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar initial={name[0]} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-slate-900">{name}</p>
          {rating != null && (
            <p className="flex items-center gap-1 text-sm text-slate-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span className="tabular font-bold text-slate-800">{Number(rating).toFixed(1)}</span>
              {driver.totalTrips != null && <span className="tabular">· {driver.totalTrips.toLocaleString()} เที่ยว</span>}
            </p>
          )}
        </div>
        {driver.vinNumber && (
          <div className="flex flex-none flex-col items-center gap-0.5">
            <StopNumber n={driver.vinNumber} selected size="lg" />
            <span className="text-[11px] font-semibold text-slate-600">เสื้อวิน</span>
          </div>
        )}
      </div>
      {(driver.licensePlate || driver.vehicleModel) && (
        <div className="flex items-center gap-3">
          {driver.licensePlate && (
            <span className="tabular rounded-md border-2 border-slate-900 bg-white px-3 py-1 text-lg font-bold tracking-wide text-slate-900">
              {driver.licensePlate}
            </span>
          )}
          {driver.vehicleModel && <span className="truncate text-sm text-slate-600">{driver.vehicleModel}</span>}
        </div>
      )}
    </div>
  );
}
