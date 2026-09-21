import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, IdCard, BookUser, ShieldCheck, Check } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";

export default function VerifyStep1() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(location.state ?? null);
  const [photoFile, setPhotoFile] = useState(null);
  const [idCardFile, setIdCardFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [error, setError] = useState("");

  const photoInputRef = useRef(null);
  const idCardInputRef = useRef(null);
  const licenseInputRef = useRef(null);

  // ถ้าไม่ได้มาจากหน้าสมัครสมาชิก (เช่น กลับมาแก้เอกสารหลังถูกปฏิเสธ) ให้ดึงข้อมูลตัวเองจาก backend แทน
  useEffect(() => {
    if (profile) return;
    api
      .get("/drivers/me")
      .then(({ data }) =>
        setProfile({
          fullName: data.fullName,
          phone: data.phone,
          vinNumber: data.vinNumber,
          vehicleModel: data.vehicleModel,
          licensePlate: data.licensePlate,
        })
      )
      .catch(() => setError("ไม่พบข้อมูลบัญชี กรุณาเข้าสู่ระบบใหม่อีกครั้ง"));
  }, [profile]);

  const canContinue = profile && photoFile && idCardFile && licenseFile;

  function handleNext() {
    if (!canContinue) {
      setError("กรุณาแนบรูปให้ครบก่อนไปขั้นตอนถัดไป");
      return;
    }
    navigate("/driver/verify/step-2", { state: { ...profile, photoFile, idCardFile, licenseFile } });
  }

  return (
    <div className="flex flex-1 flex-col bg-emerald-50">
      <TopBar title="ยืนยันตัวตนคนขับ" />
      <Screen className="gap-6 bg-transparent pt-2">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">ขั้นตอน 1/2</span>
            <span className="font-medium text-emerald-700">50% เสร็จสมบูรณ์</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-2 w-1/2 rounded-full bg-emerald-500" />
          </div>
        </div>

        {profile && (
          <Card className="gap-2">
            <h2 className="text-xl text-slate-900">ข้อมูลบัญชีของคุณ</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">ชื่อ-นามสกุล</span>
              <span className="font-semibold text-slate-900">{profile.fullName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">เบอร์โทรศัพท์</span>
              <span className="font-semibold text-slate-900">{profile.phone}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">หมายเลขวิน</span>
              <span className="font-semibold text-slate-900">{profile.vinNumber}</span>
            </div>
          </Card>
        )}

        <Card className="gap-4">
          <h2 className="text-xl text-slate-900">รูปถ่ายและเอกสาร</h2>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-col items-center gap-2 py-2">
            <p className="text-sm text-slate-600">รูปถ่ายหน้าตรง</p>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-emerald-700 bg-emerald-100/40 overflow-hidden"
            >
              {photoFile ? (
                <img src={URL.createObjectURL(photoFile)} alt="รูปถ่ายหน้าตรง" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-7 w-7 text-emerald-700" />
              )}
              <span className="absolute -bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-white shadow">
                {photoFile ? <Check className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              </span>
            </button>
          </div>
          <div>
            <p className="mb-2 text-sm text-slate-600">รูปถ่ายบัตรประชาชน</p>
            <input
              ref={idCardInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => idCardInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-emerald-700 bg-emerald-100/30 py-10"
            >
              {idCardFile ? (
                <>
                  <Check className="h-7 w-7 text-emerald-700" />
                  <span className="text-sm text-emerald-700">{idCardFile.name}</span>
                </>
              ) : (
                <>
                  <IdCard className="h-7 w-7 text-emerald-700" />
                  <span className="text-sm text-emerald-700">อัปโหลดรูปบัตรประชาชน</span>
                  <span className="text-xs text-slate-500">มองเห็นชื่อและตัวเลขชัดเจน</span>
                </>
              )}
            </button>
          </div>
          <div>
            <p className="mb-2 text-sm text-slate-600">รูปถ่ายใบขับขี่</p>
            <input
              ref={licenseInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => licenseInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-emerald-700 bg-emerald-100/30 py-10"
            >
              {licenseFile ? (
                <>
                  <Check className="h-7 w-7 text-emerald-700" />
                  <span className="text-sm text-emerald-700">{licenseFile.name}</span>
                </>
              ) : (
                <>
                  <BookUser className="h-7 w-7 text-emerald-700" />
                  <span className="text-sm text-emerald-700">อัปโหลดรูปใบขับขี่</span>
                  <span className="text-xs text-slate-500">ใบขับขี่รถจักรยานยนต์ที่ยังไม่หมดอายุ</span>
                </>
              )}
            </button>
          </div>
        </Card>

        {error && <p className="px-1 text-sm text-red-600">{error}</p>}

        <p className="flex items-start gap-2 px-1 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 flex-none text-emerald-700" />
          ข้อมูลของคุณจะได้รับการคุ้มครองตามนโยบายความเป็นส่วนตัว และใช้เพื่อการยืนยันตัวตนการให้บริการเท่านั้น
        </p>
      </Screen>
      <div className="border-t border-white/40 bg-white/70 p-5 backdrop-blur">
        <Button onClick={handleNext}>ถัดไป</Button>
      </div>
    </div>
  );
}
