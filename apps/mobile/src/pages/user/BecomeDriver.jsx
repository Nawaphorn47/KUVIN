import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, Hash, MapPinned, QrCode } from "lucide-react";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { api } from "../../lib/api";
import { setToken } from "../../lib/auth";
import { driverLanding } from "../../lib/session";
import { useApp } from "../../context/AppContext";
import { useArea } from "../../context/AreaContext";

// สมัครขับจากบัญชีผู้ใช้เดิม (ใครก็สมัครได้ ไม่ต้องสมัครบัญชีใหม่) — ได้โหมดคนขับที่ต้องส่งเอกสารให้แอดมินตรวจก่อนรับงาน
export default function BecomeDriver() {
  const navigate = useNavigate();
  const { user, setMode, refreshMe } = useApp();
  const { areas, area } = useArea();
  const [areaId, setAreaId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vinNumber, setVinNumber] = useState("");
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

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/user/become-driver", {
        areaId,
        licensePlate,
        vehicleModel: vehicleModel || undefined,
        vinNumber: vinNumber || undefined,
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
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 flex-none -rotate-6 items-center justify-center rounded-full bg-brand-600 text-white shadow-sticker">
              <Bike className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-slate-900">ว่างเมื่อไหร่ก็ขับได้</h1>
          </div>
          <p className="mt-2 text-[15px] text-slate-600">
            ใช้บัญชีเดิมของคุณ สลับโหมดได้จากหน้าบัญชี หลังกรอกข้อมูลรถจะให้แนบรูปบัตรและใบขับขี่ แอดมินตรวจผ่านแล้วถึงรับงานได้
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="driver-area" className="text-sm font-semibold text-slate-700">
                พื้นที่ที่จะรับงาน
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
            <Input
              label="ป้ายทะเบียน"
              icon={Bike}
              placeholder="เช่น กก 1234 นครปฐม"
              maxLength={40}
              required
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
              label="เบอร์เสื้อวิน (ถ้ามี)"
              icon={Hash}
              inputMode="numeric"
              placeholder="ไม่มีก็เว้นไว้ ระบบตั้งเลขให้"
              value={vinNumber}
              onChange={(e) => setVinNumber(e.target.value.replace(/\D/g, ""))}
            />
            <Input
              label="พร้อมเพย์รับเงิน (ไม่บังคับ)"
              icon={QrCode}
              inputMode="numeric"
              placeholder="เบอร์มือถือหรือเลขบัตรประชาชน"
              maxLength={13}
              value={promptPayId}
              onChange={(e) => setPromptPayId(e.target.value.replace(/\D/g, ""))}
            />
            {error && (
              <p role="alert" className="rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
                {error}
              </p>
            )}
          </div>
        </main>
        <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
          <Button type="submit" disabled={loading || !areaId || !licensePlate.trim()}>
            {loading ? "กำลังสมัคร..." : "ต่อไป แนบเอกสาร"}
          </Button>
        </div>
      </form>
    </div>
  );
}
