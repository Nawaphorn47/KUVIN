import { NavLink } from "react-router-dom";
import { MapPinned, History, Bell, User, Wallet, Bike } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";
import { useUnreadCount } from "../../lib/useUnreadCount";

// ป้ายภาษาไทยทั้งหมด — ผู้ใช้หลักรวมถึงคนขับอายุมากที่ไม่ถนัดอังกฤษ
const userTabs = [
  { to: "/home", label: "เรียกวิน", icon: MapPinned },
  { to: "/history", label: "ทริปของฉัน", icon: History },
  { to: "/notifications", label: "แจ้งเตือน", icon: Bell, showsUnread: true },
  { to: "/profile", label: "บัญชี", icon: User },
];

const driverTabs = [
  { to: "/driver/home", label: "รับงาน", icon: Bike },
  { to: "/driver/earnings", label: "การเงิน", icon: Wallet },
  { to: "/notifications", label: "แจ้งเตือน", icon: Bell, showsUnread: true },
  { to: "/driver/history", label: "ประวัติ", icon: History },
  { to: "/driver/profile", label: "บัญชี", icon: User },
];

export default function BottomNav() {
  const { mode } = useApp();
  const unread = useUnreadCount(); // จำนวนจริงจาก backend
  const tabs = mode === "driver" ? driverTabs : userTabs;

  return (
    <nav
      aria-label="เมนูหลัก"
      className="flex h-[4.5rem] flex-none items-stretch border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.map(({ to, label, icon: Icon, showsUnread }) => (
        <NavLink key={to} to={to} className="relative flex flex-1 flex-col items-center justify-center gap-1">
          {({ isActive }) => (
            <>
              <span
                className={clsx(
                  "relative flex h-8 w-12 items-center justify-center rounded-lg transition-colors",
                  isActive ? "bg-brand-600 text-white shadow-sticker" : "text-slate-500"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                {showsUnread && unread > 0 && (
                  <span className="tabular absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-here px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className={clsx("text-[11px]", isActive ? "font-bold text-brand-700" : "font-medium text-slate-500")}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
