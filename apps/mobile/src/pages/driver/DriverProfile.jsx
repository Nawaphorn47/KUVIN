import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, MapPinned, Settings, ShieldCheck, Star, Wallet } from "lucide-react";
import BottomNav from "../../components/layout/BottomNav";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import StopNumber from "../../components/ui/StopNumber";
import { useApp } from "../../context/AppContext";
import { useArea } from "../../context/AreaContext";
import { clearToken } from "../../lib/auth";
import { unregisterPush } from "../../lib/push";

// หน้าสถานะยืนยันตัวตนตามสถานะจริงของบัญชี — เดิมพาไปหน้า "ยืนยันสำเร็จ" เสมอ แม้ยังรออนุมัติหรือถูกปฏิเสธ
const VERIFY_ROUTE = {
  APPROVED: "/driver/verify/success",
  PENDING: "/driver/verify/pending",
  REJECTED: "/driver/verify/rejected",
};
const VERIFY_BADGE = {
  APPROVED: { tone: "success", label: "ผ่านแล้ว" },
  PENDING: { tone: "warning", label: "รอตรวจ" },
  REJECTED: { tone: "danger", label: "ต้องแก้" },
};

function Row({ icon: Icon, label, onClick, children }) {
  return (
    <li className="border-b border-slate-200 last:border-b-0">
      <button type="button" onClick={onClick} className="flex min-h-[3.5rem] w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50">
        <Icon className="h-5 w-5 flex-none text-slate-500" aria-hidden="true" />
        <span className="flex-1 text-[15px] font-semibold text-slate-900">{label}</span>
        {children}
        <ChevronRight className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
      </button>
    </li>
  );
}

function Fact({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="tabular truncate text-right text-[15px] font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

export default function DriverProfile() {
  const navigate = useNavigate();
  const { driver, refreshMe, switchMode } = useApp();
  const { area } = useArea();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const verify = VERIFY_BADGE[driver.verificationStatus];

  function handleLogout() {
    unregisterPush();
    clearToken();
    refreshMe();
    navigate("/login");
  }

  // บัญชีเดียวกัน — สลับกลับไปเรียกวินได้ทันที (คนขับแบบเก่าจะได้บัญชีผู้โดยสารเบอร์เดียวกันตอนกดครั้งแรก)
  async function toPassenger() {
    setSwitching(true);
    setError("");
    try {
      await switchMode("user");
      navigate("/home");
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
            <Avatar initial={driver.name[0]} size="lg" className="border-[3px] border-white bg-brand-700 text-white shadow-sticker" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold tracking-tight">{driver.name}</h1>
              <p className="tabular truncate text-sm text-brand-100">{driver.phone}</p>
            </div>
            {driver.vinNumber !== "-" && (
              <div className="flex flex-none flex-col items-center gap-0.5">
                <StopNumber n={driver.vinNumber} size="lg" className="border-white" />
                <span className="text-xs font-semibold text-brand-100">เสื้อวิน</span>
              </div>
            )}
          </div>
          <dl className="mt-5 grid grid-cols-3 border-t border-white/20 pt-4 text-center">
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-brand-100">คะแนน</dt>
              <dd className="tabular flex items-center justify-center gap-1 text-2xl font-bold">
                {driver.rating}
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
              </dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-brand-100">เที่ยว</dt>
              <dd className="tabular text-2xl font-bold">{driver.totalTrips.toLocaleString?.() ?? driver.totalTrips}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-brand-100">ปี</dt>
              <dd className="tabular text-2xl font-bold">{driver.yearsActive}</dd>
            </div>
          </dl>
        </header>

        <div className="flex flex-col gap-5 px-4 py-5">
          <button
            type="button"
            onClick={toPassenger}
            disabled={switching}
            className="flex items-center gap-3 rounded-xl bg-white p-4 text-left ring-2 ring-brand-600 active:scale-[0.98] disabled:opacity-80"
          >
            <span className="flex h-11 w-11 flex-none -rotate-6 items-center justify-center rounded-full bg-brand-600 text-white shadow-sticker">
              <MapPinned className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-slate-900">{switching ? "กำลังสลับ..." : "สลับไปโหมดเรียกวิน"}</span>
              <span className="block text-sm text-slate-600">บัญชีเดียวกัน กลับมาขับต่อได้ตลอด</span>
            </span>
            <ChevronRight className="h-5 w-5 flex-none text-brand-600" aria-hidden="true" />
          </button>
          {error && (
            <p role="alert" className="-mt-2 rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
              {error}
            </p>
          )}

          <section aria-labelledby="bike-title" className="rounded-xl bg-white px-4 py-2 ring-1 ring-slate-200">
            <h2 id="bike-title" className="pt-2 text-sm font-semibold text-slate-600">
              รถและพื้นที่
            </h2>
            <dl className="divide-y divide-slate-200">
              <Fact label="พื้นที่รับงาน">{area?.displayName ?? "-"}</Fact>
              <Fact label="ทะเบียน">{driver.plate}</Fact>
              <Fact label="รุ่น">{driver.vehicleModel || "-"}</Fact>
            </dl>
          </section>

          <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <Row
              icon={ShieldCheck}
              label="ยืนยันตัวตนคนขับ"
              onClick={() =>
                navigate(
                  VERIFY_ROUTE[driver.verificationStatus] ?? "/driver/verify/step-1",
                  driver.verificationStatus === "REJECTED" ? { state: { reason: driver.rejectionReason } } : undefined
                )
              }
            >
              {verify && <Badge tone={verify.tone}>{verify.label}</Badge>}
            </Row>
            <Row icon={Wallet} label="การเงินและต้นทุนรถ" onClick={() => navigate("/driver/earnings")} />
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
