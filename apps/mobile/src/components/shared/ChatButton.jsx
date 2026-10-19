import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import clsx from "clsx";
import { useTripChat } from "../../lib/useTripChat";

// ปุ่มเปิดแชตกับอีกฝั่งของทริป พร้อมจำนวนข้อความที่ยังไม่ได้อ่าน (จุดแดงแบบเดียวกับแท็บแจ้งเตือน)
export default function ChatButton({ request, label = "แชต", className }) {
  const navigate = useNavigate();
  const { unread } = useTripChat(request?.id);
  return (
    <button
      type="button"
      onClick={() => navigate("/trip-chat", { state: { request } })}
      aria-label={unread ? `${label} มีข้อความใหม่ ${unread} ข้อความ` : label}
      className={clsx(
        "relative flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 text-sm font-bold text-brand-800 ring-1 ring-brand-200 active:bg-brand-100",
        className
      )}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" /> {label}
      {unread > 0 && (
        <span className="tabular absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-here px-1 text-[11px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
