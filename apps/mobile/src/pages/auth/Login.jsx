import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bike, Mail, Lock, Phone, AlertTriangle, Zap } from "lucide-react";
import clsx from "clsx";
import Screen from "../../components/layout/Screen";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { api } from "../../lib/api";
import { setToken, peekSessionNotice, clearSessionNotice } from "../../lib/auth";
import { useApp } from "../../context/AppContext";

// บัญชีทดสอบจาก apps/api/prisma/seed.js — โชว์เฉพาะตอนรัน dev server (import.meta.env.DEV) หรือ APK ทดสอบที่ build
// ด้วย npm run android:dev (VITE_DEMO_LOGIN=1) เพื่อกดเข้าระบบได้เร็ว ๆ ไม่โผล่ใน build ที่จะแจกจริง
const DEMO_ACCOUNTS = [
  { label: "ผู้ใช้บริการ (สมใจ)", role: "user", email: "somjai@ku.th", password: "user1234" },
  { label: "คนขับ เบอร์วิน 1", role: "driver", phone: "0800000002", password: "driver1234" },
  { label: "คนขับ เบอร์วิน 2", role: "driver", phone: "0800000003", password: "driver1234" },
  { label: "คนขับ เบอร์วิน 3", role: "driver", phone: "0800000004", password: "driver1234" },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setMode, refreshMe } = useApp();
  const [role, setRole] = useState(location.state?.role ?? "user"); // "user" | "driver"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(peekSessionNotice); // เช่น "บัญชีถูกระงับ" หลังถูกตัดออกจากระบบ
  useEffect(clearSessionNotice, []); // แสดงครั้งเดียว

  async function performLogin({ role: loginRole, email: loginEmail, phone: loginPhone, password: loginPassword }) {
    setError("");
    setLoading(true);
    try {
      const { data } =
        loginRole === "user"
          ? await api.post("/auth/user/login", { email: loginEmail, password: loginPassword })
          : await api.post("/auth/driver/login", { phone: loginPhone, password: loginPassword });

      setToken(data.token);
      setMode(loginRole);
      refreshMe();

      if (loginRole === "user") {
        navigate("/home");
      } else if (data.driver.verificationStatus === "PENDING") {
        navigate("/driver/verify/pending");
      } else if (data.driver.verificationStatus === "REJECTED") {
        navigate("/driver/verify/rejected", { state: { reason: data.driver.rejectionReason } });
      } else {
        navigate("/driver/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    performLogin({ role, email, phone, password });
  }

  return (
    <Screen className="justify-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <Bike className="h-7 w-7" />
        </div>
        <p className="text-xs font-medium text-slate-400">มก. กำแพงแสน</p>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">ยินดีต้อนรับกลับ</h1>
        <p className="mt-1 text-sm text-slate-500">เข้าสู่ระบบเพื่อเรียกวินหรือรับงาน</p>
      </div>

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

      {(import.meta.env.DEV || import.meta.env.VITE_DEMO_LOGIN === "1") && (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <Zap className="h-3.5 w-3.5" /> เข้าสู่ระบบด่วน (เฉพาะ dev)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.label}
                type="button"
                disabled={loading}
                onClick={() => performLogin(acc)}
                className="rounded-lg bg-white px-2 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-amber-200 disabled:opacity-50"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {role === "user" && (
        <Button variant="outline" className="gap-3">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-bold text-emerald-700 ring-1 ring-slate-200">G</span>
          เข้าสู่ระบบด้วย Google
        </Button>
      )}

      {role === "user" && (
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          หรือ
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {role === "user" ? (
          <Input
            label="อีเมล"
            icon={Mail}
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : (
          <Input
            label="เบอร์โทรศัพท์"
            icon={Phone}
            placeholder="08X-XXX-XXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}
        <Input
          label="รหัสผ่าน"
          icon={Lock}
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
            Remember Me
          </label>
          {role === "user" && (
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="font-medium text-emerald-600"
            >
              ลืมรหัสผ่าน?
            </button>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 flex-none" /> {error}
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "กำลังเข้าสู่ระบบ..." : "Login"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        ยังไม่มีบัญชี?{" "}
        <button
          onClick={() => navigate("/register", { state: { role } })}
          className="font-semibold text-emerald-600"
        >
          Register
        </button>
      </p>
    </Screen>
  );
}
