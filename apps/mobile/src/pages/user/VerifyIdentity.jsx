import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Camera, Check, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import OtpForm from "../../components/shared/OtpForm";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { useApp } from "../../context/AppContext";

// ขั้นยืนยันตัวตนผู้โดยสาร (ทำครั้งเดียว): 1) เบอร์ผ่าน OTP 2) เซลฟี่ — แบบเดียวกับที่คนขับต้องยืนยัน
// state.from = หน้าที่จะกลับไปเมื่อเสร็จ / state.phoneOnly = ต้องการแค่ยืนยันเบอร์ (เช่น ก่อนสมัครขับ)
function StepMark({ n, state }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "tabular flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold",
        state === "done" && "bg-brand-600 text-white",
        state === "now" && "-rotate-6 border-[2.5px] border-brand-600 bg-white text-brand-700 shadow-sticker",
        state === "next" && "border-2 border-slate-300 bg-white text-slate-500"
      )}
    >
      {state === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
    </span>
  );
}

export default function VerifyIdentity() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshMe } = useApp();
  const from = location.state?.from ?? "/home";
  const phoneOnly = Boolean(location.state?.phoneOnly);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const loaded = Boolean(user.phone);
  const step = !user.phoneVerified ? 1 : !user.hasSelfie && !phoneOnly ? 2 : 3;

  // ครบแล้ว (หรือเข้ามาซ้ำหลังทำเสร็จ) — กลับไปทำต่อ
  useEffect(() => {
    if (loaded && step === 3) navigate(from, { replace: true, state: location.state?.fromState });
  }, [loaded, step, from, navigate, location.state]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  // ยังไม่ได้เข้าระบบ — เข้าก่อนแล้วกลับมาที่นี่
  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true, state: { from: location.pathname } });
  }, [navigate, location.pathname]);

  async function verifyPhone(_phone, code) {
    await api.post("/users/me/verify-phone", { code });
    await refreshMe();
  }

  function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/users/me/selfie", form);
      await refreshMe();
    } catch (err) {
      setError(err.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
      setUploading(false);
    }
  }

  const steps = phoneOnly ? ["ยืนยันเบอร์มือถือ"] : ["ยืนยันเบอร์มือถือ", "ถ่ายเซลฟี่"];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TopBar title="ยืนยันตัวตน" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-6 w-6 flex-none text-brand-600" aria-hidden="true" />
          <div>
            <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-slate-900">
              {phoneOnly ? "ยืนยันเบอร์ก่อนสมัครขับ" : "ยืนยันตัวตนครั้งเดียว ใช้ได้ตลอด"}
            </h1>
            <p className="mt-1 text-[15px] text-slate-600">
              คนเรียกวินก็ยืนยันตัวตนเหมือนคนขับ ให้ทั้งสองฝั่งรู้ว่ากำลังเจอใคร
            </p>
          </div>
        </div>

        <ol className="mt-5 flex gap-4" aria-label="ขั้นตอน">
          {steps.map((label, i) => {
            const state = i + 1 < step ? "done" : i + 1 === step ? "now" : "next";
            return (
              <li key={label} aria-current={state === "now" ? "step" : undefined} className="flex items-center gap-2">
                <StepMark n={i + 1} state={state} />
                <span className={clsx("text-sm font-bold", state === "next" ? "text-slate-500" : "text-slate-900")}>{label}</span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6">
          {!loaded && <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" aria-label="กำลังโหลด" />}

          {loaded && step === 1 && <OtpForm fixedPhone={user.phone} onSubmit={verifyPhone} submitLabel="ยืนยันเบอร์" />}

          {loaded && step === 2 && (
            <div className="flex flex-col gap-4">
              <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={pick} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  "relative mx-auto flex aspect-square w-56 items-center justify-center overflow-hidden rounded-full",
                  preview ? "ring-4 ring-brand-600" : "border-[3px] border-dashed border-brand-400 bg-white"
                )}
                aria-label={preview ? "ถ่ายรูปใหม่" : "เปิดกล้องถ่ายเซลฟี่"}
              >
                {preview ? (
                  <img src={preview} alt="เซลฟี่ที่เพิ่งถ่าย" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-brand-700">
                    <Camera className="h-10 w-10" />
                    <span className="text-sm font-bold">แตะเพื่อถ่ายรูป</span>
                  </span>
                )}
              </button>
              <ul className="mx-auto flex flex-col gap-1 text-sm text-slate-600">
                <li>· เห็นหน้าชัด ไม่ใส่แมสก์หรือแว่นดำ</li>
                <li>· รูปนี้เห็นเฉพาะทีมดูแลระบบ คนขับไม่เห็น</li>
              </ul>
              {error && (
                <p role="alert" className="rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
                  {error}
                </p>
              )}
              {preview ? (
                <>
                  <Button onClick={upload} disabled={uploading}>
                    {uploading ? "กำลังส่งรูป..." : "ใช้รูปนี้"}
                  </Button>
                  <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <RotateCcw className="h-4 w-4" /> ถ่ายใหม่
                  </Button>
                </>
              ) : (
                <Button onClick={() => fileRef.current?.click()}>
                  <Camera className="h-4 w-4" /> เปิดกล้อง
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
