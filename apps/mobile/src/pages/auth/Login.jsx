import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Lock, Mail, Phone, User, Zap } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import OtpForm from "../../components/shared/OtpForm";
import { Capacitor } from "@capacitor/core";
import Logo from "../../components/ui/Logo";
import GoogleButton from "../../components/shared/GoogleButton";
import { api } from "../../lib/api";
import { setToken, peekSessionNotice, clearSessionNotice } from "../../lib/auth";
import { driverLanding, useAuthConfig } from "../../lib/session";
import { useApp } from "../../context/AppContext";
import { useArea } from "../../context/AreaContext";

// บัญชีทดสอบจาก apps/api/prisma/seed.js — โชว์เฉพาะตอนรัน dev server หรือ APK ทดสอบที่ build ด้วย npm run android:dev
// __DEMO_LOGIN__ เป็นค่าคงที่ตอน build (ดู vite.config.js) build จริงจึงตัดทั้งปุ่มและรายการนี้ทิ้งไปเลย ไม่หลุดไปใน bundle
const DEMO_ACCOUNTS = __DEMO_LOGIN__ && [
  { label: "ผู้โดยสาร สมใจ", role: "user", email: "somjai@ku.th", pass: "user1234" },
  { label: "คนขับ วิน 1", role: "driver", phone: "0800000002", pass: "driver1234" },
  { label: "คนขับ วิน 2", role: "driver", phone: "0800000003", pass: "driver1234" },
  { label: "คนขับ วิน 3", role: "driver", phone: "0800000004", pass: "driver1234" },
];

const errorText = (err, fallback) => err.response?.data?.message || fallback;

function Alert({ children }) {
  return (
    <p role="alert" className="rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
      {children}
    </p>
  );
}

function Divider({ children }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <span className="h-px flex-1 bg-slate-200" />
      {children}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

// เข้าระบบ/สมัครในหน้าเดียว: เบอร์มือถือ + OTP เป็นทางหลัก (เบอร์ใหม่ = สมัครให้เลย), Google, อีเมล+รหัสผ่านของบัญชีเดิม
// และเบอร์+รหัสผ่านของคนขับที่สมัครแยกไว้ก่อนมีบัญชีเดียว
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setMode, refreshMe } = useApp();
  const { area } = useArea();
  const config = useAuthConfig();
  const [view, setView] = useState(location.state?.view ?? (location.state?.role === "driver" ? "driver" : "otp")); // otp | name | email | driver
  const [ticket, setTicket] = useState("");
  const [googleTicket, setGoogleTicket] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(peekSessionNotice); // เช่น "บัญชีถูกระงับ" หลังถูกตัดออกจากระบบ
  useEffect(clearSessionNotice, []); // แสดงครั้งเดียว

  function enter(role, data) {
    setToken(data.token);
    setMode(role);
    refreshMe();
    if (role === "user") navigate(location.state?.from ?? "/home", { replace: true });
    else navigate(...driverLanding(data.driver));
  }

  function go(next) {
    setError("");
    setView(next);
  }

  async function verifyOtp(otpPhone, code) {
    const { data } = await api.post("/auth/otp/verify", { phone: otpPhone, code, googleTicket: googleTicket || undefined });
    if (data.needsName) {
      setTicket(data.ticket);
      go("name");
    } else enter("user", data);
  }

  async function completeSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/otp/complete", { ticket, fullName, googleTicket: googleTicket || undefined });
      enter("user", data);
    } catch (err) {
      setError(errorText(err, "สร้างบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง"));
      setLoading(false);
    }
  }

  async function googleCredential(credential) {
    setError("");
    try {
      const { data } = await api.post("/auth/google", { credential });
      if (data.needsPhone) {
        // บัญชี Google ใหม่ — ยืนยันเบอร์ก่อน แล้วผูกสองอย่างเข้าด้วยกัน
        setGoogleTicket(data.googleTicket);
        if (data.name) setFullName(data.name);
        go("otp");
      } else enter("user", data);
    } catch (err) {
      setError(errorText(err, "เข้าสู่ระบบด้วย Google ไม่สำเร็จ"));
    }
  }

  async function passwordLogin({ role, email: e, phone: p, password: pw }) {
    setLoading(true);
    setError("");
    try {
      const { data } =
        role === "user"
          ? await api.post("/auth/user/login", { email: e, password: pw })
          : await api.post("/auth/driver/login", { phone: p, password: pw });
      enter(role, data);
    } catch (err) {
      setError(errorText(err, "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง"));
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    otp: googleTicket ? "ยืนยันเบอร์มือถือ" : "เข้าใช้ด้วยเบอร์มือถือ",
    name: "เรียกคุณว่าอะไรดี?",
    email: "เข้าด้วยอีเมล",
    driver: "คนขับบัญชีเดิม",
  };
  const subtitles = {
    otp: googleTicket
      ? "ผูกเบอร์กับบัญชี Google ให้คนขับติดต่อคุณได้"
      : "ยังไม่มีบัญชีก็ใช้เบอร์นี้สมัครได้เลย บัญชีเดียวใช้ได้ทั้งเรียกวินและขับวิน",
    name: "ชื่อนี้คนขับจะเห็นตอนมารับ",
    email: "สำหรับบัญชีที่สมัครด้วยอีเมลและรหัสผ่านไว้แล้ว",
    driver: "สำหรับคนขับที่สมัครด้วยเบอร์และรหัสผ่านก่อนมีบัญชีเดียว",
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      {/* แผ่นป้ายหัว: ชื่อแอป + วิทยาเขต (แบรนด์ของวิทยาเขตที่เลือกอยู่) */}
      <header className="flex-none bg-brand-600 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-3">
          <Logo dark className="h-14 w-14 flex-none" />
          <div>
            <p className="text-2xl font-bold leading-none tracking-tight">KUVIN</p>
            <p className="mt-1 text-sm text-brand-100">{area?.displayName ?? "เรียกวินมอเตอร์ไซค์"}</p>
          </div>
        </div>
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-6">
        {view !== "otp" && (
          <button
            type="button"
            onClick={() => go("otp")}
            className="-ml-1 mb-3 flex h-9 items-center gap-1 text-sm font-bold text-brand-700"
          >
            <ChevronLeft className="h-4 w-4" /> ใช้เบอร์มือถือแทน
          </button>
        )}
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900">{titles[view]}</h1>
        <p className="mt-1 text-[15px] text-slate-600">{subtitles[view]}</p>

        <div className="mt-6 flex flex-col gap-4">
          {error && view !== "otp" && <Alert>{error}</Alert>}

          {view === "otp" && (
            <>
              {error && <Alert>{error}</Alert>}
              <OtpForm onSubmit={verifyOtp} submitLabel="เข้าใช้งาน" />
              {config?.otp === "off" && <Alert>ตอนนี้ยังเข้าด้วย OTP ไม่ได้ ใช้วิธีอื่นด้านล่างแทน</Alert>}
              {!googleTicket && (
                <>
                  <Divider>หรือ</Divider>
                  {/* ในแอป Android (Capacitor) origin คือ https://localhost ซึ่ง Google ไม่รับสำหรับ Web client — ซ่อนปุ่ม ใช้เบอร์โทร/อีเมลแทน */}
              {config?.googleClientId && !Capacitor.isNativePlatform() && <GoogleButton clientId={config.googleClientId} onCredential={googleCredential} />}
                  <Button variant="secondary" onClick={() => go("email")}>
                    <Mail className="h-4 w-4" /> ใช้อีเมลและรหัสผ่าน
                  </Button>
                  <button type="button" onClick={() => go("driver")} className="h-10 text-sm font-bold text-brand-700">
                    คนขับที่สมัครด้วยรหัสผ่านไว้แล้ว
                  </button>
                </>
              )}
            </>
          )}

          {view === "name" && (
            <form onSubmit={completeSignup} className="flex flex-col gap-4">
              <Input
                label="ชื่อ-นามสกุล"
                icon={User}
                autoComplete="name"
                autoFocus
                maxLength={80}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Button type="submit" disabled={loading || fullName.trim().length < 2}>
                {loading ? "กำลังสร้างบัญชี..." : "เริ่มใช้งาน"}
              </Button>
            </form>
          )}

          {view === "email" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                passwordLogin({ role: "user", email, password });
              }}
              className="flex flex-col gap-4"
            >
              <Input label="อีเมล" icon={Mail} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input
                label="รหัสผ่าน"
                icon={Lock}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" disabled={loading}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
              <div className="flex justify-between text-sm font-bold text-brand-700">
                <button type="button" onClick={() => navigate("/forgot-password")} className="h-10">
                  ลืมรหัสผ่าน?
                </button>
                <button type="button" onClick={() => navigate("/register")} className="h-10">
                  สมัครด้วยอีเมล
                </button>
              </div>
            </form>
          )}

          {view === "driver" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                passwordLogin({ role: "driver", phone, password });
              }}
              className="flex flex-col gap-4"
            >
              <Input
                label="เบอร์มือถือ"
                icon={Phone}
                inputMode="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
              <Input
                label="รหัสผ่าน"
                icon={Lock}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" disabled={loading}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าโหมดคนขับ"}
              </Button>
            </form>
          )}

          {__DEMO_LOGIN__ && (
            <section aria-labelledby="demo-title" className="mt-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-3">
              <h2 id="demo-title" className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                <Zap className="h-4 w-4" aria-hidden="true" /> เข้าด่วน (เฉพาะตอนพัฒนา)
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.label}
                    type="button"
                    disabled={loading}
                    onClick={() => passwordLogin({ ...acc, password: acc.pass })}
                    className="h-10 rounded-lg bg-white px-2 text-sm font-semibold text-slate-800 ring-1 ring-amber-200 active:bg-amber-100 disabled:text-slate-500"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
