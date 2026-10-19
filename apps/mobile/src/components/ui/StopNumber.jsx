import clsx from "clsx";

// เลขในวงกลมแบบสติกเกอร์ — ชุดเดียวกับหมุดเลขบนแผนผัง (.kv-stop) ใช้ได้ทั้งเลขปลายทางและเลขเสื้อวิน
export default function StopNumber({ n, selected = false, size = "md", className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "tabular flex flex-none items-center justify-center rounded-full font-bold transition-all duration-300",
        size === "lg" ? "h-12 w-12 text-xl" : size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-[15px]",
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
