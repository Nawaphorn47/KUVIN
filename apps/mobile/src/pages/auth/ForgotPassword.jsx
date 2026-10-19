import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, FlaskConical, Lock, Mail } from "lucide-react";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import DigitBoxes from "../../components/ui/DigitBoxes";
import { api } from "../../lib/api";

// 3 ขั้นตอน: กรอกอีเมล → กรอกรหัส 6 หลักที่ได้ทางอีเมล + รหัสผ่านใหม่ → สำเร็จ
// (ใช้รหัสแทนลิงก์ เพราะลิงก์ในอีเมลเปิดกลับเข้าแอปมือถือไม่ได้ตรง ๆ)
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // "email" | "code" | "done"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [devCode, setDevCode] = useState(""); // backend ส่งมาเฉพาะตอน dev ที่ยังไม่ได้ตั้งค่าอีเมล
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(e) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/user/forgot-password", { email });
      setInfo(data.message);
      setDevCode(data.devResetCode ?? "");
      setStep("code");
    } catch (err) {
      setError(err.response?.data?.message || "ส่งรหัสไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/user/reset-password", { email, code, newPassword: password });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  const errorLine = error && (
    <p role="alert" className="rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
      {error}
    </p>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TopBar title="ลืมรหัสผ่าน" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-6">
        {step === "email" && (
          <>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900">รีเซ็ตรหัสผ่าน</h1>
            <p className="mt-1 text-[15px] text-slate-600">กรอกอีเมลที่ใช้สมัคร เราจะส่งรหัสยืนยัน 6 หลักไปให้</p>
            <form className="mt-6 flex flex-col gap-4" onSubmit={requestCode}>
              <Input
                label="อีเมล"
                icon={Mail}
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errorLine}
              <Button type="submit" disabled={loading || !email}>
                {loading ? "กำลังส่ง..." : "ส่งรหัสยืนยัน"}
              </Button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900">ตั้งรหัสผ่านใหม่</h1>
            <p className="mt-1 text-[15px] text-slate-600">{info}</p>
            {devCode && (
              <div role="status" className="mt-4 flex items-center gap-3 rounded-xl bg-amber-100 px-3 py-2.5 text-amber-950">
                <FlaskConical className="h-5 w-5 flex-none" aria-hidden="true" />
                <p className="text-sm">
                  <span className="font-bold">โหมดทดสอบ</span> ยังไม่ได้ตั้งค่าอีเมล รหัสคือ{" "}
                  <span className="tabular font-bold tracking-widest">{devCode}</span>
                </p>
              </div>
            )}
            <form className="mt-5 flex flex-col gap-4" onSubmit={resetPassword}>
              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">รหัสยืนยัน 6 หลัก</p>
                <DigitBoxes length={6} label="รหัสยืนยัน 6 หลัก" value={code} onChange={setCode} />
              </div>
              <Input
                label="รหัสผ่านใหม่"
                icon={Lock}
                type="password"
                autoComplete="new-password"
                placeholder="อย่างน้อย 8 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="ยืนยันรหัสผ่านใหม่"
                icon={Lock}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {errorLine}
              <Button type="submit" disabled={loading || code.length !== 6 || password.length < 8}>
                {loading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
              </Button>
            </form>
            <button type="button" onClick={() => requestCode()} disabled={loading} className="mt-3 h-11 w-full text-sm font-bold text-brand-700">
              ไม่ได้รับรหัส? ส่งใหม่
            </button>
          </>
        )}

        {step === "done" && (
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <span className="flex h-16 w-16 -rotate-6 items-center justify-center rounded-full bg-brand-600 text-white shadow-sticker">
              <Check className="h-8 w-8" strokeWidth={3} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">เปลี่ยนรหัสผ่านแล้ว</h1>
            <p className="text-[15px] text-slate-600">เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย</p>
            <Button onClick={() => navigate("/login", { state: { view: "email" } })}>ไปหน้าเข้าสู่ระบบ</Button>
          </div>
        )}

        {step !== "done" && (
          <button type="button" onClick={() => navigate("/login")} className="mt-6 h-10 w-full text-sm font-medium text-slate-600">
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        )}
      </main>
    </div>
  );
}
