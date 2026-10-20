import clsx from "clsx";
import { fileUrl } from "../../lib/api";

// วงกลมรูปโปรไฟล์: มีรูป (src) → แสดงรูป / ไม่มี → ตัวอักษรแรกของชื่อ
export default function Avatar({ initial = "?", src = null, size = "md", className }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-xl",
    xl: "h-24 w-24 text-3xl",
  };
  const base = clsx("inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-emerald-100 font-bold text-emerald-700", sizes[size], className);
  if (src) return <img src={fileUrl(src)} alt="" className={clsx(base, "object-cover")} draggable="false" />;
  return <span className={base}>{initial}</span>;
}
