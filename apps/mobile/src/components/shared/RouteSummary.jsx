export default function RouteSummary({ pickup, destination }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center pt-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span className="my-1 h-6 w-px border-l border-dashed border-slate-300" />
        <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div>
          <p className="text-xs text-slate-400">จุดรับ</p>
          <p className="text-sm font-semibold text-slate-900">{pickup}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">ปลายทาง</p>
          <p className="text-sm font-semibold text-slate-900">{destination}</p>
        </div>
      </div>
    </div>
  );
}
