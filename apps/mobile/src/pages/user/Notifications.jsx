import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import clsx from "clsx";
import BottomNav from "../../components/layout/BottomNav";
import { api } from "../../lib/api";

export default function Notifications() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/notifications")
      .then(({ data }) => setItems(data))
      .catch((err) => setError(err.response?.data?.message || "โหลดการแจ้งเตือนไม่สำเร็จ"));
  }, []);

  function markRead(id) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    api.post(`/notifications/${id}/read`).catch(() => {});
  }

  const unread = (items ?? []).filter((n) => !n.isRead).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <header className="flex-none bg-brand-600 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <h1 className="text-2xl font-bold tracking-tight">แจ้งเตือน</h1>
        {items && <p className="tabular mt-1 text-brand-100">{unread > 0 ? `ยังไม่ได้อ่าน ${unread} รายการ` : "อ่านครบแล้ว"}</p>}
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {error && (
          <p role="alert" className="rounded-xl bg-here-soft px-4 py-3 text-sm text-here">
            {error}
          </p>
        )}
        {!items && !error && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-brand-600" aria-label="กำลังโหลด" />}
        {items?.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <Bell className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-base font-semibold text-slate-900">ยังไม่มีแจ้งเตือน</p>
            <p className="text-sm text-slate-600">สถานะทริปและข่าวจากระบบจะขึ้นที่นี่</p>
          </div>
        )}
        {items?.length > 0 && (
          <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {items.map((n) => (
              <li key={n.id} className="border-b border-slate-200 last:border-b-0">
                <button
                  type="button"
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={clsx("flex w-full gap-3 px-4 py-3.5 text-left", !n.isRead && "bg-brand-50")}
                >
                  <span
                    aria-label={n.isRead ? undefined : "ยังไม่ได้อ่าน"}
                    className={clsx("mt-1.5 h-3 w-3 flex-none rounded-full", n.isRead ? "border-2 border-slate-300" : "bg-brand-600")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-[15px] text-slate-900", !n.isRead ? "font-bold" : "font-semibold")}>{n.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">{n.body}</span>
                    <span className="tabular mt-1 block text-xs text-slate-500">{formatRelative(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function formatRelative(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม. ที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}
