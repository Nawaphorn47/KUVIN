import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, Check, GraduationCap, Hash, MapPinned, QrCode, Users } from "lucide-react";
import clsx from "clsx";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { api } from "../../lib/api";
import { setToken } from "../../lib/auth";
import { driverLanding } from "../../lib/session";
import { DRIVER_TYPES, TYPE_ORDER, docInfo } from "../../lib/driverTypes";
import { useApp } from "../../context/AppContext";
import { useArea } from "../../context/AreaContext";

// การ์ดเลือกประเภทคนขับ — บอกเลยว่าต้องเตรียมเอกสารอะไร ก่อนเริ่มกรอก
function TypeCard({ type, selected, onSelect }) {
  const t = DRIVER_TYPES[type];
  const Icon = t.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(type)}
      className={clsx(
        "flex w-full items-start gap-3 rounded-xl p-4 text-left transition-all",
        selected ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-1 ring-slate-200 active:bg-slate-50"
      )}
    >
      <span
        className={clsx(
          "flex h-11 w-11 flex-none items-center justify-center rounded-full transition-transform",
          selected ? "-rotate-6 bg-brand-600 text-white shadow-sticker" : "bg-slate-100 text-slate-600"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-slate-900">{t.label}</span>
        <span className="block text-sm text-slate-600">{t.tagline}</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {t.docs
            .filter((k) => k !== "photoUrl")
            .map((k) => (
              <span key={k} className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {docInfo(type, k).label}
              </span>
            ))}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={clsx(
          "mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border-2",
          selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
        )}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

// สมัครขับจากบัญชีผู้ใช้เดิม (ใครก็สมัครได้ ไม่ต้องสมัครบัญชีใหม่) — เลือกประเภทก่อน เพราะเอกสารที่ต้องแนบต่างกัน
// คิวรับงานเดียวกันทุกประเภท ส่งเอกสารแล้วรอแอดมินตรวจก่อนรับงาน
export default function BecomeDriver() {
  const navigate = useNavigate();
  const { user, setMode, refreshMe } = useApp();
  const { areas, area } = useArea();
  const [driverType, setDriverType] = useState("");
  const [areaId, setAreaId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vinNumber, setVinNumber] = useState("");
  const [studentId, setStudentId] = useState("");
  const [winGroupName, setWinGroupName] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!areaId && area) setAreaId(area.id);
  }, [area, areaId]);

  // ต้องยืนยันเบอร์ก่อน (คนขับต้องติดต่อได้จริง) — ไปยืนยันแล้วกลับมาที่นี่
  useEffect(() => {
    if (user.phone && !user.phoneVerified) {
      navigate("/verify-identity", { replace: true, state: { from: "/become-driver", phoneOnly: true } });
    }
  }, [user.phone, user.phoneVerified, navigate]);

  const isPro = driverType === "PRO";
  const isStudent = driverType === "STUDENT";
  const ready =
    driverType &&
    areaId &&
    licensePlate.trim() &&
    (!isStudent || studentId.length >= 5) &&
    (!isPro || (vinNumber && winGroupName.trim()));

  async function submit(e) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/user/become-driver", {
        driverType,
        areaId,
        licensePlate,
        vehicleModel: vehicleModel || undefined,
        vinNumber: vinNumber || undefined,
        studentId: isStudent ? studentId : undefined,
        winGroupName: isPro ? winGroupName : undefined,
        promptPayId: promptPayId || undefined,
      });
      setToken(data.token);
      setMode("driver");
      refreshMe();
      navigate(...driverLanding(data.driver));
    } catch (err) {
      setError(err.response?.data?.message || "สมัครขับไม่สำเร็จ ลองใหม่อีกครั้ง");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TopBar title="สมัครขับวิน" />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
          <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-slate-900">คุณขับในฐานะอะไร?</h1>
          <p className="mt-1 text-[15px] text-slate-600">
            ทุกประเภทเข้าคิวรับงานเดียวกัน ต่างกันแค่เอกสารที่ใช้ยืนยันตัวตน
          </p>

          <div role="radiogroup" aria-label="ประเภทคนขับ" className="mt-5 flex flex-col gap-3">
            {TYPE_ORDER.map((t) => (
              <TypeCard key={t} type={t} selected={driverType === t} onSelect={setDriverType} />
            ))}
          </div>

          {driverType && (
            <div className="mt-7 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-900">ข้อมูลรถและวิทยาเขต</h2>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="driver-area" className="text-sm font-semibold text-slate-700">
                  วิทยาเขตที่จะรับงาน
                </label>
                <span className="relative flex items-center">
                  <MapPinned aria-hidden="true" className="pointer-events-none absolute left-4 h-5 w-5 text-slate-500" />
                  <select
                    id="driver-area"
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="h-[3.25rem] w-full appearance-none rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 text-[15px] text-slate-900 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName}
                      </option>
                    ))}
                  </select>
                </span>
              </div>

              {isStudent && (
                <Input
                  label="รหัสนิสิต"
                  icon={GraduationCap}
                  inputMode="numeric"
                  maxLength={15}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
                  className="tabular"
                />
              )}
              {isPro && (
                <Input
                  label="ชื่อวินที่สังกัด"
                  icon={Users}
                  placeholder="เช่น วินหน้าประตู 1"
                  maxLength={60}
                  value={winGroupName}
                  onChange={(e) => setWinGroupName(e.target.value)}
                />
              )}
              <Input
                label="ป้ายทะเบียน"
                icon={Bike}
                placeholder={isPro ? "ป้ายเหลือง เช่น 1กข 1234 นครปฐม" : "เช่น กก 1234 นครปฐม"}
                maxLength={40}
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
              />
              <Input
                label="รุ่นรถ (ไม่บังคับ)"
                placeholder="เช่น Honda Wave 125"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
              />
              <Input
                label={isPro ? "เบอร์เสื้อวิน" : "เบอร์ประจำตัวในคิว (ไม่บังคับ)"}
                icon={Hash}
                inputMode="numeric"
                placeholder={isPro ? "เลขบนเสื้อวิน" : "เว้นไว้ ระบบตั้งเลขให้"}
                value={vinNumber}
                onChange={(e) => setVinNumber(e.target.value.replace(/\D/g, ""))}
                className="tabular"
              />
              <Input
                label="พร้อมเพย์รับเงิน (ไม่บังคับ)"
                icon={QrCode}
                inputMode="numeric"
                placeholder="เบอร์มือถือหรือเลขบัตรประชาชน"
                maxLength={13}
                value={promptPayId}
                onChange={(e) => setPromptPayId(e.target.value.replace(/\D/g, ""))}
                className="tabular"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
              {error}
            </p>
          )}
        </main>
        <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
          <Button type="submit" disabled={loading || !ready}>
            {loading ? "กำลังสมัคร..." : (driverType && "ต่อไป แนบเอกสาร") || "เลือกประเภทก่อน"}
          </Button>
        </div>
      </form>
    </div>
  );
}
