import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, KeyRound, Lock, Hash, AlertTriangle, CheckCircle2 } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
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
      setError(err.response?.data?.message || "ส่งรหัสไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
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
      setError(err.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  const errorLine = error && (
    <p className="flex items-center gap-1.5 text-left text-sm text-red-600">
      <AlertTriangle className="h-4 w-4 flex-none" /> {error}
    </p>
  );

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="ลืมรหัสผ่าน" />
      <Screen className="items-center gap-6 pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          {step === "done" ? <CheckCircle2 className="h-8 w-8" /> : <KeyRound className="h-8 w-8" />}
        </div>

        {step === "email" && (
          <>
            <div>
              <h1 className="text-xl font-bold text-slate-900">รีเซ็ตรหัสผ่าน</h1>
              <p className="mt-2 text-sm text-slate-500">
                กรอกอีเมลที่ใช้สมัคร เราจะส่งรหัสยืนยัน 6 หลักไปให้
              </p>
            </div>
            <form className="flex w-full flex-col gap-4" onSubmit={requestCode}>
              <Input
                label="อีเมล"
                icon={Mail}
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errorLine}
              <Button type="submit" disabled={loading}>
                {loading ? "กำลังส่ง..." : "ส่งรหัสยืนยัน"}
              </Button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ตั้งรหัสผ่านใหม่</h1>
              <p className="mt-2 text-sm text-slate-500">{info}</p>
            </div>
            {devCode && (
              <p className="w-full rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                โหมด dev (ยังไม่ได้ตั้งค่าอีเมล): รหัสของคุณคือ <span className="font-bold tracking-widest">{devCode}</span>
              </p>
            )}
            <form className="flex w-full flex-col gap-4" onSubmit={resetPassword}>
              <Input
                label="รหัสยืนยัน 6 หลัก"
                icon={Hash}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="tracking-[0.4em]"
                required
              />
              <Input
                label="รหัสผ่านใหม่"
                icon={Lock}
                type="password"
                placeholder="อย่างน้อย 8 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="ยืนยันรหัสผ่านใหม่"
                icon={Lock}
                type="password"
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {errorLine}
              <Button type="submit" disabled={loading || code.length !== 6}>
                {loading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
              </Button>
            </form>
            <button onClick={() => requestCode()} disabled={loading} className="text-sm font-medium text-emerald-600">
              ไม่ได้รับรหัส? ส่งใหม่
            </button>
          </>
        )}

        {step === "done" && (
          <>
            <div>
              <h1 className="text-xl font-bold text-slate-900">เปลี่ยนรหัสผ่านสำเร็จ</h1>
              <p className="mt-2 text-sm text-slate-500">เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย</p>
            </div>
            <Button className="w-full" onClick={() => navigate("/login", { state: { role: "user" } })}>
              ไปหน้าเข้าสู่ระบบ
            </Button>
          </>
        )}

        {step !== "done" && (
          <button onClick={() => navigate("/login")} className="text-sm text-slate-500">
            กลับไป Login
          </button>
        )}
      </Screen>
    </div>
  );
}
