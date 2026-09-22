import { NavLink } from "react-router-dom";
import { Home, History, Bell, User, Wallet } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";
import { useUnreadCount } from "../../lib/useUnreadCount";

const userTabs = [
  { to: "/home", label: "หน้าหลัก", icon: Home },
  { to: "/history", label: "History", icon: History },
  { to: "/notifications", label: "Notification", icon: Bell, showsUnread: true },
  { to: "/profile", label: "Profile", icon: User },
];

// คนขับเดิมไม่มีทางเข้าหน้าแจ้งเตือนเลย (ไม่มีปุ่ม/แท็บไหนพาไปได้) ทั้งที่ backend ส่งแจ้งเตือนสำคัญให้
// (เช่น "ได้รับชำระเงินแล้ว" ตอนผู้โดยสารโอนสำเร็จ) เพิ่มแท็บนี้ให้ตรงกับฝั่งผู้โดยสาร
const driverTabs = [
  { to: "/driver/home", label: "หน้าหลัก", icon: Home },
  { to: "/driver/earnings", label: "รายได้", icon: Wallet },
  { to: "/notifications", label: "แจ้งเตือน", icon: Bell, showsUnread: true },
  { to: "/driver/history", label: "History", icon: History },
  { to: "/driver/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const { mode } = useApp();
  const unread = useUnreadCount(); // จำนวนจริงจาก backend — เดิม tab ผู้ใช้ฝังเลข 2 ไว้ตายตัว ไม่ตรงความจริง
  const tabs = mode === "driver" ? driverTabs : userTabs;

  return (
    <nav className="flex h-16 flex-none items-stretch border-t border-slate-100 bg-white">
      {tabs.map(({ to, label, icon: Icon, showsUnread }) => (
        <NavLink
          key={to}
          to={to}
          className="relative flex flex-1 flex-col items-center justify-center gap-1"
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                <Icon
                  className={clsx("h-6 w-6", isActive ? "text-emerald-600" : "text-slate-400")}
                />
                {showsUnread && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span
                className={clsx(
                  "text-[10px] font-medium",
                  isActive ? "text-emerald-600" : "text-slate-400"
                )}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
