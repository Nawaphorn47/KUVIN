import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, Camera, ChevronRight, LogOut, Pencil, Phone, Settings, User2 } from "lucide-react";
import BottomNav from "../../components/layout/BottomNav";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import AreaSwitcher from "../../components/shared/AreaSwitcher";
import { useApp } from "../../context/AppContext";
import { clearToken } from "../../lib/auth";
import { driverLanding } from "../../lib/session";
import { unregisterPush } from "../../lib/push";

const DRIVER_STATUS = {
  APPROVED: { tone: "success", label: "พร้อมรับงาน" },
  PENDING: { tone: "warning", label: "รอแอดมินตรวจ" },
  REJECTED: { tone: "danger", label: "ต้องแก้เอกสาร" },
};

function Row({ icon: Icon, label, detail, onClick, children }) {
  return (
    <li className="border-b border-slate-200 last:border-b-0">
      <button type="button" onClick={onClick} className="flex min-h-[3.5rem] w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50">
        <Icon className="h-5 w-5 flex-none text-slate-500" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-slate-900">{label}</span>
          {detail && <span className="tabular block truncate text-sm text-slate-600">{detail}</span>}
        </span>
        {children}
        <ChevronRight className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
      </button>
    </li>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshMe, switchMode } = useApp();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const driverStatus = user.driverMode && DRIVER_STATUS[user.driverMode.verificationStatus];

  function handleLogout() {
    unregisterPush();
    clearToken();
    refreshMe();
    navigate("/login");
  }

  async function toDriver() {
    if (!user.driverMode) return navigate("/become-driver");
    setSwitching(true);
    setError("");
    try {
      const data = await switchMode("driver");
      navigate(...driverLanding(data.driver));
    } catch (err) {
      setError(err.response?.data?.message || "สลับโหมดไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSwitching(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <header className="bg-brand-600 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar initial={user.avatarInitial} size="lg" className="border-[3px] border-white bg-brand-700 text-white shadow-sticker" />
              <button
                type="button"
                onClick={() => navigate("/profile/edit")}
                aria-label="แก้ไขข้อมูลส่วนตัว"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-700 shadow-sticker"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold tracking-tight">{user.name || "บัญชีของฉัน"}</h1>
              <p className="tabular truncate text-sm text-brand-100">{user.phone || user.email}</p>
            </div>
            <div className="flex-none text-right">
              <p className="tabular text-[2rem] font-bold leading-none">{user.totalTrips}</p>
              <p className="text-sm text-brand-100">เที่ยว</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-5 px-4 py-5">
          {/* บัญชีเดียวสลับโหมด — สมัครขับแล้วกดสลับได้ทันที ยังไม่สมัครก็สมัครจากตรงนี้ */}
          <button
            type="button"
            onClick={toDriver}
            disabled={switching}
            className="flex items-center gap-3 rounded-xl bg-slate-900 p-4 text-left text-white shadow-floating active:scale-[0.98] disabled:opacity-80"
          >
            <span className="flex h-11 w-11 flex-none -rotate-6 items-center justify-center rounded-full bg-brand-600 shadow-sticker">
              <Bike className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">
                {switching ? "กำลังสลับ..." : (user.driverMode && "สลับไปโหมดคนขับ") || "อยากขับวินด้วย?"}
              </span>
              <span className="block text-sm text-slate-300">
                {user.driverMode ? "บัญชีเดียวกัน สลับกลับได้ตลอด" : "ใครก็สมัครได้ ใช้บัญชีนี้เลย ไม่ต้องสมัครใหม่"}
              </span>
            </span>
            {driverStatus ? (
              <Badge tone={driverStatus.tone}>{driverStatus.label}</Badge>
            ) : (
              <ChevronRight className="h-5 w-5 flex-none text-slate-400" aria-hidden="true" />
            )}
          </button>
          {error && (
            <p role="alert" className="-mt-2 rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
              {error}
            </p>
          )}

          <section aria-labelledby="identity-title">
            <h2 id="identity-title" className="mb-2 text-sm font-semibold text-slate-600">
              ยืนยันตัวตน
            </h2>
            <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              <Row icon={Phone} label="เบอร์มือถือ" detail={user.phone} onClick={() => navigate("/verify-identity", { state: { from: "/profile" } })}>
                <Badge tone={user.phoneVerified ? "success" : "warning"}>{user.phoneVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}</Badge>
              </Row>
              <Row icon={Camera} label="เซลฟี่" detail="ต้องมีก่อนเรียกวินครั้งแรก" onClick={() => navigate("/verify-identity", { state: { from: "/profile" } })}>
                <Badge tone={user.hasSelfie ? "success" : "warning"}>{user.hasSelfie ? "มีแล้ว" : "ยังไม่มี"}</Badge>
              </Row>
            </ul>
          </section>

          {/* บัญชีเดียวใช้ได้ทุกพื้นที่ — เปลี่ยนพื้นที่ตรงนี้ได้ (ปกติระบบเลือกให้จาก GPS) */}
          <section aria-labelledby="area-title">
            <h2 id="area-title" className="mb-2 text-sm font-semibold text-slate-600">
              พื้นที่ที่ใช้อยู่
            </h2>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <AreaSwitcher />
            </div>
          </section>

          <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <Row icon={User2} label="ข้อมูลส่วนตัว" onClick={() => navigate("/profile/edit")} />
            <Row icon={Settings} label="ตั้งค่า" onClick={() => navigate("/settings")} />
          </ul>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-here active:bg-here-soft"
          >
            <LogOut className="h-5 w-5" /> ออกจากระบบ
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
