import { useNavigate } from "react-router-dom";
import { UserCog, ShieldCheck, Settings, LogOut, User2, ChevronRight } from "lucide-react";
import Screen from "../../components/layout/Screen";
import BottomNav from "../../components/layout/BottomNav";
import Card from "../../components/ui/Card";
import Avatar from "../../components/ui/Avatar";
import { useApp } from "../../context/AppContext";
import { clearToken } from "../../lib/auth";
import { unregisterPush } from "../../lib/push";

const menu = [
  { icon: UserCog, label: "แก้ไขข้อมูลส่วนตัว" },
  { icon: ShieldCheck, label: "ยืนยันตัวตน", to: "/driver/verify/success" },
  { icon: Settings, label: "ตั้งค่า", to: "/settings" },
];

export default function DriverProfile() {
  const navigate = useNavigate();
  const { driver, refreshMe } = useApp();

  function handleLogout(loginState) {
    unregisterPush();
    clearToken();
    refreshMe();
    navigate("/login", loginState && { state: loginState });
  }

  return (
    <div className="flex flex-1 flex-col">
      <Screen padded={false} className="gap-4 bg-gradient-to-b from-slate-800 to-slate-900 px-5 pb-6 pt-8 text-white">
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar initial={driver.name[0]} size="xl" className="bg-white/15 text-white" />
          <p className="text-2xl font-bold">{driver.name}</p>
          <p className="text-sm text-white/70">
            {driver.vinNumber} · {driver.phone}
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
          <div>
            <p className="text-2xl font-bold">{driver.rating}</p>
            <p className="text-xs text-white/60">★ คะแนน</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{driver.totalTrips.toLocaleString()}</p>
            <p className="text-xs text-white/60">เที่ยว</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{driver.yearsActive}</p>
            <p className="text-xs text-white/60">ปี</p>
          </div>
        </div>
      </Screen>

      <Screen className="gap-4 pt-4">
        <Card className="gap-2 shadow-none ring-slate-100">
          <p className="text-sm font-bold text-slate-700">ข้อมูลรถ</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">รุ่น</span>
            <span className="font-semibold text-slate-900">{driver.vehicleModel}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">ทะเบียน</span>
            <span className="font-semibold text-slate-900">{driver.plate}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">หมายเลขวิน</span>
            <span className="font-semibold text-slate-900">{driver.vinNumber}</span>
          </div>
        </Card>

        <button
          onClick={() => handleLogout({ role: "user" })}
          className="flex items-center gap-3 rounded-2xl bg-emerald-600 p-4 text-left text-white"
        >
          <User2 className="h-6 w-6" />
          <div className="flex-1">
            <p className="text-base font-bold">เข้าสู่ระบบด้วยบัญชีผู้ใช้บริการ</p>
            <p className="text-xs text-white/70">เรียกวินมอเตอร์ไซค์ (ต้องมีบัญชีผู้ใช้แยกต่างหาก)</p>
          </div>
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

        <button
          onClick={() => handleLogout()}
          className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-red-600"
        >
          <LogOut className="h-4 w-4" /> ออกจากระบบ
        </button>
      </Screen>
      <BottomNav />
    </div>
  );
}
