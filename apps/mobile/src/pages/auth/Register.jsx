import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, Check, ChevronLeft, IdCard, Lock, Mail, Phone, User } from "lucide-react";
import clsx from "clsx";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Logo from "../../components/ui/Logo";
import { api } from "../../lib/api";
import { setToken } from "../../lib/auth";
import { useApp } from "../../context/AppContext";
import { useArea } from "../../context/AreaContext";

// สมัครด้วยอีเมล + รหัสผ่าน (ทางเลือกของคนที่ไม่อยากใช้ OTP) — ได้บัญชีเดียวแบบเดียวกับสมัครด้วยเบอร์
// สมัครขับไม่ได้แยกที่นี่แล้ว: สมัครบัญชีก่อน แล้วกด "อยากขับวินด้วย?" ในหน้าบัญชี (ใช้บัญชีเดียวกัน)
// เบอร์ที่กรอกยังไม่ได้ยืนยัน — จะให้ยืนยันด้วย OTP + เซลฟี่ก่อนเรียกวินครั้งแรก
export default function Register() {
  const navigate = useNavigate();
  const { setMode, refreshMe } = useApp();
  const { area } = useArea();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordShort = password.length > 0 && password.length < 8;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const ready = fullName.trim() && phone.length === 10 && email && password.length >= 8 && !mismatch && agreed;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/user/register", {
        fullName: fullName.trim(),
        phone,
        email,
        password,
        studentId: studentId || undefined,
      });
      setToken(data.token);
      setMode("user");
      refreshMe();
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <header className="flex-none bg-brand-600 px-4 pb-5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="ย้อนกลับ"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-11 w-11 flex-none -rotate-6 items-center justify-center rounded-full border-[3px] border-white bg-brand-700 shadow-sticker">
            <Logo className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">สมัครด้วยอีเมล</h1>
            <p className="text-sm text-brand-100">{area?.displayName ?? "KU VIN"} · บัญชีเดียว ทั้งเรียกวินและขับวิน</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-brand-300 bg-white px-3 py-3 text-left active:bg-brand-50"
          >
            <Phone className="h-5 w-5 flex-none text-brand-600" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-slate-900">ใช้เบอร์มือถือแทน เร็วกว่า</span>
              <span className="block text-sm text-slate-600">รับรหัส OTP แล้วเข้าใช้ได้เลย ไม่ต้องตั้งรหัสผ่าน</span>
            </span>
          </button>

          <fieldset className="mt-6 flex flex-col gap-4">
            <legend className="mb-3 text-sm font-semibold text-slate-600">ข้อมูลของคุณ</legend>
            <Input label="ชื่อ-นามสกุล" icon={User} autoComplete="name" maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input
              label="เบอร์มือถือ"
              icon={Phone}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="08X XXX XXXX"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="tabular"
            />
            <Input
              label="อีเมล"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="อีเมลไหนก็ได้"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="รหัสนิสิต/บุคลากร (ไม่บังคับ)"
              icon={IdCard}
              inputMode="numeric"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
            />
          </fieldset>

          <fieldset className="mt-6 flex flex-col gap-4">
            <legend className="mb-3 text-sm font-semibold text-slate-600">ตั้งรหัสผ่าน</legend>
            <div>
              <Input
                label="รหัสผ่าน"
                icon={Lock}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="pw-hint"
              />
              <p id="pw-hint" className={clsx("mt-1 text-sm", passwordShort ? "font-semibold text-here" : "text-slate-500")}>
                อย่างน้อย 8 ตัวอักษร
              </p>
            </div>
            <div>
              <Input
                label="ยืนยันรหัสผ่าน"
                icon={Lock}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {mismatch && <p className="mt-1 text-sm font-semibold text-here">รหัสผ่านสองช่องยังไม่ตรงกัน</p>}
            </div>
          </fieldset>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="peer sr-only" />
            <span
              aria-hidden="true"
              className={clsx(
                "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 transition-all peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100",
                agreed ? "-rotate-6 border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"
              )}
            >
              {agreed && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
            <span className="text-sm text-slate-700">ฉันยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของ KU VIN</span>
          </label>

          <p className="mt-4 flex items-start gap-2 text-sm text-slate-600">
            <Bike className="mt-0.5 h-4 w-4 flex-none text-brand-600" aria-hidden="true" />
            อยากขับวินด้วย? สมัครบัญชีนี้ก่อน แล้วกด “อยากขับวินด้วย?” ในหน้าบัญชี
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
              {error}
            </p>
          )}
        </main>
        <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
          <Button type="submit" disabled={loading || !ready}>
            {loading ? "กำลังสมัคร..." : "สมัครและเริ่มใช้งาน"}
          </Button>
        </div>
      </form>
    </div>
  );
}
