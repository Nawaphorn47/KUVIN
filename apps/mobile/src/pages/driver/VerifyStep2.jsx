import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bike, Palette, Hash, Camera, Check } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { api, uploadImage } from "../../lib/api";

export default function VerifyStep2() {
  const navigate = useNavigate();
  const location = useLocation();
  const step1 = location.state ?? {};

  const [vehicleModel, setVehicleModel] = useState(step1.vehicleModel ?? "");
  const [color, setColor] = useState("");
  const [licensePlate, setLicensePlate] = useState(step1.licensePlate ?? "");
  const [vehicleFile, setVehicleFile] = useState(null);
  const [plateFile, setPlateFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const vehicleInputRef = useRef(null);
  const plateInputRef = useRef(null);

  const canSubmit = vehicleModel && licensePlate && vehicleFile && plateFile && !submitting;

  async function handleSubmit() {
    if (!step1.photoFile || !step1.idCardFile || !step1.licenseFile) {
      setError("ไม่พบข้อมูลจากขั้นตอนที่ 1 กรุณาย้อนกลับไปกรอกใหม่");
      return;
    }
    if (!vehicleModel || !licensePlate || !vehicleFile || !plateFile) {
      setError("กรุณากรอกข้อมูลและแนบรูปให้ครบก่อนส่งตรวจสอบ");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const [photoUrl, idCardPhotoUrl, driverLicensePhotoUrl, vehiclePhotoUrl, platePhotoUrl] = await Promise.all([
        uploadImage(step1.photoFile),
        uploadImage(step1.idCardFile),
        uploadImage(step1.licenseFile),
        uploadImage(vehicleFile),
        uploadImage(plateFile),
      ]);

      await api.post("/drivers/me/verify", {
        vinNumber: step1.vinNumber,
        licensePlate,
        vehicleModel,
        photoUrl,
        idCardPhotoUrl,
        driverLicensePhotoUrl,
        vehiclePhotoUrl,
        platePhotoUrl,
      });

      navigate("/driver/verify/pending");
    } catch (err) {
      setError(err.response?.data?.message || "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-emerald-50">
      <TopBar title="ยืนยันตัวตนคนขับ" />
      <Screen className="gap-6 bg-transparent pt-2">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-emerald-700">ขั้นตอน 2/2</span>
            <span className="text-slate-600">ข้อมูลรถ</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-1.5 w-full rounded-full bg-emerald-700" />
          </div>
        </div>

        <Card className="gap-4">
          <h2 className="text-xl text-slate-900">รายละเอียดรถจักรยานยนต์</h2>
          <Input
            label="ยี่ห้อ / รุ่นรถ"
            icon={Bike}
            placeholder="เช่น Honda Forza 350"
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
          />
          <Input
            label="สีรถ"
            icon={Palette}
            placeholder="เช่น ดำ-เขียว"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <Input
            label="เลขทะเบียนรถ"
            icon={Hash}
            placeholder="1กข 1234 กรุงเทพฯ"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
          />
        </Card>

        <Card className="gap-4">
          <h2 className="text-xl text-slate-900">รูปถ่ายประกอบ</h2>

          <input
            ref={vehicleInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setVehicleFile(e.target.files?.[0] ?? null)}
          />
          <div>
            <p className="mb-2 text-sm text-slate-600">รูปถ่ายรถเต็มคัน (เห็นป้ายทะเบียนชัดเจน)</p>
            <button
              type="button"
              onClick={() => vehicleInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-emerald-100 bg-slate-50 py-10"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-200">
                {vehicleFile ? <Check className="h-6 w-6 text-emerald-700" /> : <Camera className="h-6 w-6 text-emerald-700" />}
              </span>
              <span className="text-sm text-emerald-700">{vehicleFile ? vehicleFile.name : "อัปโหลดรูป"}</span>
            </button>
          </div>

          <input
            ref={plateInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setPlateFile(e.target.files?.[0] ?? null)}
          />
          <div>
            <p className="mb-2 text-sm text-slate-600">รูปถ่ายเฉพาะป้ายทะเบียน</p>
            <button
              type="button"
              onClick={() => plateInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-emerald-100 bg-slate-50 py-10"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-200">
                {plateFile ? <Check className="h-6 w-6 text-emerald-700" /> : <Camera className="h-6 w-6 text-emerald-700" />}
              </span>
              <span className="text-sm text-emerald-700">{plateFile ? plateFile.name : "อัปโหลดรูป"}</span>
            </button>
          </div>
        </Card>

        {error && <p className="px-1 text-sm text-red-600">{error}</p>}
      </Screen>
      <div className="border-t border-white/40 bg-white/70 p-5 backdrop-blur">
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "กำลังส่งข้อมูล..." : "ส่งข้อมูลเพื่อตรวจสอบ"}
        </Button>
      </div>
    </div>
  );
}
