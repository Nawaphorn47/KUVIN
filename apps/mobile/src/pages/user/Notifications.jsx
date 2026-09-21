import { useEffect, useState } from "react";
import { Bike, Loader2 } from "lucide-react";
import Screen from "../../components/layout/Screen";
import BottomNav from "../../components/layout/BottomNav";
import { api } from "../../lib/api";
import clsx from "clsx";

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

  return (
    <div className="flex flex-1 flex-col">
      <Screen className="gap-4">
        <h1 className="text-xl font-bold text-slate-900">Notification</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!items && !error && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
          </div>
        )}

        {items && items.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีการแจ้งเตือน</p>
        )}

        <div className="flex flex-col divide-y divide-slate-100">
          {items?.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className="flex gap-3 py-4 text-left"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Bike className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{n.title}</p>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                </div>
                <p className={clsx("mt-0.5 text-sm text-slate-500")}>{n.body}</p>
                <p className="mt-1 text-xs text-slate-400">{formatRelative(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      </Screen>
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
