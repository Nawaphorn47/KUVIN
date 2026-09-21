import { NavLink } from "react-router-dom";
import { Home, History, Bell, User, Wallet } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";

const userTabs = [
  { to: "/home", label: "หน้าหลัก", icon: Home },
  { to: "/history", label: "History", icon: History, badge: false },
  { to: "/notifications", label: "Notification", icon: Bell, badge: 2 },
  { to: "/profile", label: "Profile", icon: User },
];

const driverTabs = [
  { to: "/driver/home", label: "หน้าหลัก", icon: Home },
  { to: "/driver/earnings", label: "รายได้", icon: Wallet },
  { to: "/driver/history", label: "History", icon: History },
  { to: "/driver/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const { mode } = useApp();
  const tabs = mode === "driver" ? driverTabs : userTabs;

  return (
    <nav className="flex h-16 flex-none items-stretch border-t border-slate-100 bg-white">
      {tabs.map(({ to, label, icon: Icon, badge }) => (
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
                {badge && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {badge}
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
