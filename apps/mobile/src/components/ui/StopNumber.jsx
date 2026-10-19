import clsx from "clsx";

// เลขในวงกลมแบบสติกเกอร์ — ชุดเดียวกับหมุดเลขบนแผนผัง (.kv-stop) ใช้ได้ทั้งเลขปลายทางและเลขเสื้อวิน
// ขนาด: [1-2 หลัก, 3 หลัก, 4 หลักขึ้นไป] — เลขเสื้อวิน/ลำดับที่ยาวต้องไม่ล้นวงกลม
const SIZES = {
  sm: ["h-6 w-6 text-xs", "h-6 w-6 text-[10px]", "h-6 w-6 text-[8px]"],
  md: ["h-8 w-8 text-[15px]", "h-8 w-8 text-xs", "h-8 w-8 text-[10px]"],
  lg: ["h-12 w-12 text-xl", "h-12 w-12 text-base", "h-12 w-12 text-xs"],
};

export default function StopNumber({ n, selected = false, size = "md", className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "tabular flex flex-none items-center justify-center overflow-hidden rounded-full font-bold tracking-tighter transition-all duration-300",
        SIZES[size === "lg" || size === "sm" ? size : "md"][Math.min(String(n).length, 4) <= 2 ? 0 : String(n).length === 3 ? 1 : 2],
        selected
          ? "-rotate-6 scale-110 bg-brand-600 text-white shadow-sticker"
          : "border-[2.5px] border-brand-600 bg-white text-brand-700",
        className
      )}
    >
      {n}
    </span>
  );
}
