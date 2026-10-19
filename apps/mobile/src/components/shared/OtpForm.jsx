import { useEffect, useRef, useState } from "react";
import { FlaskConical, Phone } from "lucide-react";
import clsx from "clsx";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { api } from "../../lib/api";

const CODE_LENGTH = 6;
const errorText = (err, fallback) => err.response?.data?.message || fallback;

// ช่องรหัส 6 หลัก: input จริงตัวเดียว (วางรหัส/เติมอัตโนมัติจาก SMS ได้) วางทับกล่องสติกเกอร์ 6 กล่องที่ใช้แสดงผล
function CodeBoxes({ value, onChange, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <div aria-hidden="true" className="grid grid-cols-6 gap-2">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const active = focused && i === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <span
              key={i}
              className={clsx(
                "tabular flex h-14 items-center justify-center rounded-xl border-2 bg-white text-2xl font-bold text-slate-900 transition-all",
                value[i] ? "border-brand-600" : "border-slate-200",
                active && "-translate-y-0.5 border-brand-600 ring-4 ring-brand-100"
              )}
            >
              {value[i] ?? ""}
            </span>
          );
        })}
      </div>
      <input
        aria-label="รหัส OTP 6 หลัก"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        value={value}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
}

/**
 * ขอรหัส OTP ไปที่เบอร์ แล้วกรอกรหัส — ส่ง (phone, code) ให้ onSubmit ไปยืนยันกับ endpoint ที่เหมาะกับงานนั้น
 *  - fixedPhone : เบอร์ที่ล็อกไว้ (ยืนยันเบอร์ของบัญชีตัวเอง) ไม่ส่ง = ให้กรอกเบอร์เอง
 *  - submitLabel : ข้อความปุ่มตอนกรอกรหัส
 * โหมดทดสอบ (ยังไม่ซื้อ SMS) server คืนรหัสมาให้ — โชว์ในแถบเหลืองพร้อมปุ่มกรอกให้ ไม่ทำเป็นว่าส่ง SMS แล้ว
 */
export default function OtpForm({ fixedPhone, onSubmit, submitLabel = "ยืนยันรหัส" }) {
  const [phone, setPhone] = useState(fixedPhone ?? "");
  const [step, setStep] = useState("phone");
  const [code, setCode] = useState("");
  const [testCode, setTestCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitted = useRef("");

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode(e) {
    e?.preventDefault();
    if (!/^0\d{9}$/.test(phone)) {
      setError("เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/otp/request", { phone });
      setTestCode(data.testCode ?? "");
      setCooldown(data.resendInSec ?? 30);
      setCode("");
      submitted.current = "";
      setStep("code");
    } catch (err) {
      setError(errorText(err, "ส่งรหัสไม่สำเร็จ ลองใหม่อีกครั้ง"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (value.length !== CODE_LENGTH || submitted.current === value) return;
    submitted.current = value; // กันยิงซ้ำตอนเติมครบ 6 หลักแล้วกดปุ่มตามอีกที
    setBusy(true);
    setError("");
    try {
      await onSubmit(phone, value);
    } catch (err) {
      setError(errorText(err, "ยืนยันรหัสไม่สำเร็จ ลองใหม่อีกครั้ง"));
      submitted.current = "";
    } finally {
      setBusy(false);
    }
  }

  function changeCode(value) {
    setCode(value);
    if (value.length === CODE_LENGTH) verify(value); // ครบ 6 หลักส่งเลย ไม่ต้องกดปุ่ม
  }

  if (step === "phone") {
    return (
      <form onSubmit={requestCode} className="flex flex-col gap-4">
        {fixedPhone ? (
          <p className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
            <Phone className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <span className="tabular text-lg font-bold tracking-wide text-slate-900">{fixedPhone}</span>
          </p>
        ) : (
          <Input
            label="เบอร์มือถือ"
            icon={Phone}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="08X XXX XXXX"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            className="tabular text-lg font-semibold tracking-wide"
          />
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || phone.length !== 10}>
          {busy ? "กำลังส่งรหัส..." : "ขอรหัส OTP"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        กรอกรหัส 6 หลักที่ส่งไปที่ <span className="tabular font-bold text-slate-900">{phone}</span>
        {!fixedPhone && (
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="ml-2 font-bold text-brand-700 underline underline-offset-2"
          >
            เปลี่ยนเบอร์
          </button>
        )}
      </p>

      {testCode && (
        <div role="status" className="flex items-center gap-3 rounded-xl bg-amber-100 px-3 py-2.5 text-amber-950">
          <FlaskConical className="h-5 w-5 flex-none" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-bold">โหมดทดสอบ</span> ยังไม่ส่ง SMS จริง รหัสคือ{" "}
            <span className="tabular font-bold tracking-widest">{testCode}</span>
          </p>
          <button
            type="button"
            onClick={() => changeCode(testCode)}
            className="h-9 flex-none rounded-lg bg-amber-950 px-3 text-sm font-bold text-amber-50 active:scale-95"
          >
            ใส่ให้
          </button>
        </div>
      )}

      <CodeBoxes value={code} onChange={changeCode} disabled={busy} />

      {error && (
        <p role="alert" className="rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
          {error}
        </p>
      )}

      <Button onClick={() => verify()} disabled={busy || code.length !== CODE_LENGTH}>
        {busy ? "กำลังตรวจรหัส..." : submitLabel}
      </Button>
      <button
        type="button"
        onClick={requestCode}
        disabled={cooldown > 0 || busy}
        className="tabular h-10 text-sm font-bold text-brand-700 disabled:font-medium disabled:text-slate-500"
      >
        {cooldown > 0 ? `ขอรหัสใหม่ได้ใน ${cooldown} วินาที` : "ไม่ได้รับรหัส? ขอใหม่"}
      </button>
    </div>
  );
}
