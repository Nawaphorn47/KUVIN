import clsx from "clsx";

// สถานะเป็นเครื่องหมายพิมพ์คู่กับสี (คนตาบอดสีหรืออ่านกลางแดดก็แยกได้): จุดทึบ = เกิดแล้ว/ปกติ, จุดกลวง = รอ, ขีด = ยกเลิก
const tones = {
  success: "bg-brand-100 text-brand-800",
  danger: "bg-here-soft text-here",
  warning: "bg-amber-100 text-amber-900",
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-sky-100 text-sky-900",
};

const marks = {
  success: "bg-current",
  danger: "bg-current",
  warning: "border-[1.5px] border-current",
  neutral: "border-[1.5px] border-current",
  info: "border-[1.5px] border-current",
};

export default function Badge({ tone = "neutral", mark = true, className, children }) {
  return (
    <span
      className={clsx("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold", tones[tone], className)}
    >
      {mark && <span aria-hidden="true" className={clsx("h-2 w-2 flex-none rounded-full", marks[tone])} />}
      {children}
    </span>
  );
}
