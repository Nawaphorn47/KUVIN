import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, IdCard, BookUser, Mail, Phone, Lock, Hash, Bike, Camera, QrCode, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import PhotoPicker from "../../components/shared/PhotoPicker";
import { api, uploadImage } from "../../lib/api";
import { setToken } from "../../lib/auth";
import { useApp } from "../../context/AppContext";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setMode, refreshMe } = useApp();
  const [role, setRole] = useState(location.state?.role ?? "user"); // "user" | "driver"

  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vinNumber, setVinNumber] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [photoFile, setPhotoFile] = useState(null);
  const [idCardFile, setIdCardFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [vehicleFile, setVehicleFile] = useState(null);
  const [plateFile, setPlateFile] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (role === "user") {
      setLoading(true);
      try {
        const { data } = await api.post("/auth/user/register", { fullName, phone, email, password, studentId });
        setToken(data.token);
        setMode("user");
        refreshMe();
        navigate("/home");
      } catch (err) {
        setError(err.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setLoading(false);
      }
      return;
    }

    // role === "driver" — สมัครพร้อมแนบเอกสารยืนยันตัวตนในขั้นตอนเดียว ไม่ต้องแยกไปหน้าอื่นต่อ
    if (!/^\d+$/.test(vinNumber)) {
      setError("หมายเลขวินต้องเป็นตัวเลขล้วนเท่านั้น (ใช้กำหนดลำดับคิวรับงาน)");
      return;
    }
    if (!photoFile || !idCardFile || !licenseFile || !vehicleFile || !plateFile) {
      setError("กรุณาแนบรูปให้ครบทั้ง 5 รูปก่อนสมัครสมาชิก");
      return;
    }
    if (promptPayId && !/^\d{10}$/.test(promptPayId) && !/^\d{13}$/.test(promptPayId)) {
      setError("พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/driver/register", {
        fullName,
        phone,
        password,
        vinNumber,
        licensePlate,
        vehicleModel,
        promptPayId: promptPayId || undefined,
      });
      setToken(data.token);
      setMode("driver");

      const [photoUrl, idCardPhotoUrl, driverLicensePhotoUrl, vehiclePhotoUrl, platePhotoUrl] = await Promise.all([
        uploadImage(photoFile),
        uploadImage(idCardFile),
        uploadImage(licenseFile),
        uploadImage(vehicleFile),
        uploadImage(plateFile),
      ]);

      await api.post("/drivers/me/verify", {
        photoUrl,
        idCardPhotoUrl,
        driverLicensePhotoUrl,
        vehiclePhotoUrl,
        platePhotoUrl,
      });

      refreshMe();
      navigate("/driver/verify/pending");
    } catch (err) {
      setError(err.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Register" />
      <Screen className="gap-4 pt-2">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          {[
            { value: "user", label: "ผู้ใช้บริการ" },
            { value: "driver", label: "คนขับ" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className={clsx(
                "rounded-xl py-2.5 text-sm font-semibold transition-colors",
                role === opt.value ? "bg-white text-emerald-700 shadow-card" : "text-slate-500"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {role === "user" ? (
          <p className="text-sm text-slate-500">สมัครสมาชิกด้วยอีเมลมหาวิทยาลัย @ku.th เท่านั้น</p>
        ) : (
          <p className="text-sm text-slate-500">
            สมัครบัญชีคนขับด้วยเบอร์โทรศัพท์ พร้อมแนบเอกสารยืนยันตัวตนในขั้นตอนเดียว — แอดมินตรวจสอบและอนุมัติ
            ก่อนจึงเริ่มรับงานได้
          </p>
        )}

        {role === "user" && (
          <>
            <Button variant="outline" className="gap-3">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-bold text-emerald-700 ring-1 ring-slate-200">G</span>
              Register ด้วย Google (@ku.th)
            </Button>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              หรือกรอกข้อมูล
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            label="ชื่อ-นามสกุล"
            icon={User}
            placeholder="ชื่อ นามสกุล"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {role === "user" ? (
            <>
              <Input
                label="รหัสนิสิต / รหัสพนักงาน"
                icon={IdCard}
                placeholder="64010001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
              <Input
                label="อีเมล (@ku.th)"
                icon={Mail}
                type="email"
                placeholder="name@ku.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="เบอร์โทรศัพท์"
                icon={Phone}
                placeholder="0xx-xxx-xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </>
          ) : (
            <>
              <Input
                label="เบอร์โทรศัพท์"
                icon={Phone}
                placeholder="0xx-xxx-xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="หมายเลขวิน (ตัวเลขเท่านั้น)"
                icon={Hash}
                placeholder="เช่น 1, 2, 3 — ใช้กำหนดลำดับคิวรับงาน"
                inputMode="numeric"
                value={vinNumber}
                onChange={(e) => setVinNumber(e.target.value)}
              />
              <Input
                label="ยี่ห้อ / รุ่นรถ"
                icon={Bike}
                placeholder="เช่น Honda Wave 125"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
              />
              <Input
                label="เลขทะเบียนรถ"
                icon={Hash}
                placeholder="1กข 1234 กรุงเทพฯ"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
              />
              <Input
                label="พร้อมเพย์ (ไม่บังคับ)"
                icon={QrCode}
                placeholder="เบอร์โทร 10 หลัก หรือเลขบัตร ปชช. 13 หลัก"
                inputMode="numeric"
                value={promptPayId}
                onChange={(e) => setPromptPayId(e.target.value)}
              />
              <p className="-mt-2 text-xs text-slate-400">
                ใส่ไว้ให้ระบบสร้าง QR รับเงินอัตโนมัติตอนจบทริป ไม่ใส่ก็ได้ รับเงินสดตามปกติ
              </p>

              <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">เอกสารยืนยันตัวตน</p>
                <PhotoPicker label="รูปถ่ายหน้าตรง" icon={Camera} file={photoFile} onChange={setPhotoFile} />
                <PhotoPicker
                  label="รูปบัตรประชาชน"
                  hint="มองเห็นชื่อและตัวเลขชัดเจน"
                  icon={IdCard}
                  file={idCardFile}
                  onChange={setIdCardFile}
                />
                <PhotoPicker
                  label="รูปใบขับขี่"
                  hint="ใบขับขี่รถจักรยานยนต์ที่ยังไม่หมดอายุ"
                  icon={BookUser}
                  file={licenseFile}
                  onChange={setLicenseFile}
                />
                <PhotoPicker
                  label="รูปรถเต็มคัน"
                  hint="เห็นป้ายทะเบียนชัดเจน"
                  icon={Camera}
                  file={vehicleFile}
                  onChange={setVehicleFile}
                />
                <PhotoPicker label="รูปป้ายทะเบียน" icon={Camera} file={plateFile} onChange={setPlateFile} />
              </div>
            </>
          )}

          <Input
            label="รหัสผ่าน"
            icon={Lock}
            type="password"
            placeholder="อย่างน้อย 8 ตัวอักษร"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="ยืนยันรหัสผ่าน"
            icon={Lock}
            type="password"
            placeholder="ยืนยันรหัสผ่าน"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <label className="flex items-start gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              required
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            ฉันยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของ KU VIN
          </label>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 flex-none" /> {error}
            </p>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
          </Button>
        </form>
      </Screen>
    </div>
  );
}
