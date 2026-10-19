// จุดรับ → ปลายทาง บนเส้นตั้ง 1px — จุดรับเป็นวงสีแบรนด์ ปลายทางเป็นสี่เหลี่ยมเข้ม (ชุดเดียวกับหมุดบนแผนที่)
export default function RouteSummary({ pickup, destination }) {
  return (
    <div className="flex items-stretch gap-3">
      <div aria-hidden="true" className="flex flex-col items-center py-1.5">
        <span className="h-3 w-3 rounded-full border-[3px] border-brand-600 bg-white" />
        <span className="my-1 w-px flex-1 bg-slate-300" />
        <span className="h-3 w-3 rounded-[3px] bg-slate-900" />
      </div>
      <dl className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <dt className="text-xs text-slate-500">จุดรับ</dt>
          <dd className="truncate text-[15px] font-semibold text-slate-900">{pickup}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">ปลายทาง</dt>
          <dd className="truncate text-[15px] font-semibold text-slate-900">{destination}</dd>
        </div>
      </dl>
    </div>
  );
}
