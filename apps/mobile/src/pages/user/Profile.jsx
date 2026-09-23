import { useNavigate } from "react-router-dom";
import { Heart, User2, Settings, LogOut, Bike, Pencil, ChevronRight } from "lucide-react";
import Screen from "../../components/layout/Screen";
import BottomNav from "../../components/layout/BottomNav";
import Card from "../../components/ui/Card";
import Avatar from "../../components/ui/Avatar";
import { useApp } from "../../context/AppContext";
import { clearToken } from "../../lib/auth";
import { unregisterPush } from "../../lib/push";

const menu = [
  { icon: Heart, label: "สถานที่โปรด" },
  { icon: User2, label: "ข้อมูลส่วนตัว", to: "/profile/edit" },
  { icon: Settings, label: "ตั้งค่า", to: "/settings" },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshMe } = useApp();

  function handleLogout(loginState) {
    unregisterPush();
    clearToken();
    refreshMe();
    navigate("/login", loginState && { state: loginState });
  }

  return (
    <div className="flex flex-1 flex-col">
      <Screen padded={false} className="gap-0">
        <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 pb-8 pt-8 text-white">
          <div className="relative">
            <Avatar initial={user.avatarInitial} size="xl" className="bg-white/20 text-white" />
            <button
              onClick={() => navigate("/profile/edit")}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{user.name}</p>
            <p className="text-sm text-white/70">{user.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">{user.totalTrips}</span>
            <span className="text-xs text-white/70">เที่ยว</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          <button
            onClick={() => handleLogout({ role: "driver" })}
            className="flex items-center gap-3 rounded-2xl bg-slate-900 p-4 text-left text-white"
          >
            <Bike className="h-6 w-6" />
            <div className="flex-1">
              <p className="text-base font-bold">เข้าสู่ระบบด้วยบัญชีคนขับ</p>
              <p className="text-xs text-white/70">รับงานวินมอเตอร์ไซค์ (ต้องมีบัญชีคนขับแยกต่างหาก)</p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">สลับ</span>
          </button>

          <Card className="divide-y divide-slate-100 p-0 shadow-none ring-slate-100">
            {menu.map(({ icon: Icon, label, to }) => (
              <button
                key={label}
                onClick={() => to && navigate(to)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <Icon className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-sm font-medium text-slate-900">{label}</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ))}
          </Card>

          <Card className="flex items-center justify-between shadow-none ring-slate-100">
            <div>
              <p className="text-xs text-slate-400">เบอร์โทรศัพท์</p>
              <p className="text-sm font-semibold text-slate-900">{user.phone}</p>
            </div>
            <button onClick={() => navigate("/profile/edit")} className="text-sm font-medium text-emerald-600">
              แก้ไข
            </button>
          </Card>

          <button
            onClick={() => handleLogout()}
            className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-red-600"
          >
            <LogOut className="h-4 w-4" /> ออกจากระบบ
          </button>
        </div>
      </Screen>
      <BottomNav />
    </div>
  );
}
