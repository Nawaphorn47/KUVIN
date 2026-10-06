import { NavLink } from "react-router-dom";
import { Home, History, Bell, User, Wallet } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";
import { useUnreadCount } from "../../lib/useUnreadCount";

// ป้ายภาษาไทยทั้งหมด (เดิมปนอังกฤษ History/Notification/Profile) — ผู้ใช้หลักรวมถึงวินอายุมากที่ไม่ถนัดอังกฤษ
const userTabs = [
  { to: "/home", label: "หน้าหลัก", icon: Home },
  { to: "/history", label: "ประวัติ", icon: History },
  { to: "/notifications", label: "แจ้งเตือน", icon: Bell, showsUnread: true },
  { to: "/profile", label: "โปรไฟล์", icon: User },
];

const driverTabs = [
  { to: "/driver/home", label: "รับงาน", icon: Home },
  { to: "/driver/earnings", label: "การเงิน", icon: Wallet },
  { to: "/notifications", label: "แจ้งเตือน", icon: Bell, showsUnread: true },
  { to: "/driver/history", label: "ประวัติ", icon: History },
  { to: "/driver/profile", label: "โปรไฟล์", icon: User },
];

export default function BottomNav() {
  const { mode } = useApp();
  const unread = useUnreadCount(); // จำนวนจริงจาก backend
  const tabs = mode === "driver" ? driverTabs : userTabs;

  return (
    <nav className="flex h-[4.25rem] flex-none items-stretch border-t border-slate-100 bg-white px-2">
      {tabs.map(({ to, label, icon: Icon, showsUnread }) => (
        <NavLink key={to} to={to} className="relative flex flex-1 flex-col items-center justify-center gap-0.5">
          {({ isActive }) => (
            <>
              <span
                className={clsx(
                  "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-emerald-100 text-emerald-700" : "text-slate-400"
                )}
              >
                <Icon className="h-[1.375rem] w-[1.375rem]" />
                {showsUnread && unread > 0 && (
                  <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className={clsx("text-[11px] font-medium", isActive ? "text-emerald-700" : "text-slate-500")}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
