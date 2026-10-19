import { useState } from "react";
import clsx from "clsx";

// ช่องกรอกตัวเลขแบบกล่องสติกเกอร์ (OTP 6 หลัก / PIN ขึ้นรถ 4 หลัก) — input จริงตัวเดียววางทับกล่องที่ใช้แสดงผล
// วางรหัส/เติมอัตโนมัติจาก SMS ได้ตามปกติ
export default function DigitBoxes({ length, value, onChange, disabled, label, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <div aria-hidden="true" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
        {Array.from({ length }, (_, i) => {
          const active = focused && i === Math.min(value.length, length - 1);
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
        aria-label={label}
        inputMode="numeric"
        autoComplete={length === 6 ? "one-time-code" : "off"}
        autoFocus={autoFocus}
        maxLength={length}
        value={value}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
}
