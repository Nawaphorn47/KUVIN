import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import clsx from "clsx";

// แถบหัว: ปกติพื้นขาวเส้นบางด้านล่าง / board = แผ่นป้ายสีแบรนด์ของพื้นที่ (ใช้กับหน้าหลักของแต่ละโหมด)
// dark ยังรองรับหน้าเก่า (เช่น หน้าระหว่างเดินทาง) ที่ใช้พื้นเข้ม
export default function TopBar({ title, onBack, transparent = false, dark = false, board = false, right }) {
  const navigate = useNavigate();
  const onColor = dark || board;
  return (
    <div
      className={clsx(
        "flex h-14 flex-none items-center gap-3 px-4",
        barBackground(transparent, board, dark),
        onColor && "text-white"
      )}
    >
      {onBack !== null && (
        <button
          type="button"
          onClick={onBack ?? (() => navigate(-1))}
          aria-label="ย้อนกลับ"
          className={clsx(
            "flex h-10 w-10 flex-none items-center justify-center rounded-lg transition-colors",
            onColor ? "bg-white/15 active:bg-white/25" : "bg-slate-100 active:bg-slate-200"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {title && <h1 className="flex-1 truncate text-lg font-bold tracking-tight">{title}</h1>}
      {right}
    </div>
  );
}
function barBackground(transparent, board, dark) {
  if (transparent) return "bg-transparent";
  if (board) return "bg-brand-600";
  if (dark) return "bg-slate-900";
  return "border-b border-slate-200 bg-white";
}
