import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, Loader2, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { api, fileUrl, uploadDriverDocument } from "../../lib/api";
import { DRIVER_TYPES, docInfo } from "../../lib/driverTypes";

// ช่องแนบรูปหนึ่งใบ — เลือกแล้วโชว์รูปตัวอย่างพร้อมเครื่องหมายถูก, มีของเดิม (ส่งไปแล้วรอบก่อน) = แนบแล้ว แตะเพื่อเปลี่ยน
function DocTile({ info, file, existing, onPick }) {
  const ref = useRef(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : fileUrl(existing) || ""), [file, existing]);
  useEffect(() => () => file && URL.revokeObjectURL(preview), [file, preview]);
  const Icon = info.icon;
  const done = Boolean(file || existing);
  return (
    <li>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={info.round ? "user" : "environment"}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={clsx(
          "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors",
          done ? "bg-white ring-2 ring-brand-600" : "border-2 border-dashed border-slate-300 bg-white active:bg-slate-50"
        )}
      >
        <span
          className={clsx(
            "relative flex h-16 w-16 flex-none items-center justify-center overflow-hidden bg-slate-100 text-slate-500",
            info.round ? "rounded-full" : "rounded-lg"
          )}
        >
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Icon className="h-6 w-6" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-slate-900">{info.label}</span>
          <span className="block text-sm text-slate-600">{docHint({ done, file, hint: info.hint })}</span>
        </span>
        <span
          aria-hidden="true"
          className={clsx(
            "flex h-8 w-8 flex-none items-center justify-center rounded-full",
            done ? "-rotate-6 bg-brand-600 text-white shadow-sticker" : "bg-slate-100 text-slate-500"
          )}
        >
          {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Camera className="h-4 w-4" />}
        </span>
      </button>
    </li>
  );
}

// ส่งเอกสารยืนยันตัวตนคนขับ (หน้าเดียวจบ) — รายการเอกสารขึ้นกับประเภทคนขับที่เลือกตอนสมัคร
// ใช้ทั้งตอนเพิ่งสมัคร และตอนกลับมาแก้หลังแอดมินปฏิเสธ (เอกสารที่ส่งแล้วใช้ต่อได้ เปลี่ยนเฉพาะใบที่ต้องแก้)
export default function VerifyStep1() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [files, setFiles] = useState({});
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/drivers/me")
      .then(({ data }) => {
        setMe(data);
        setLicensePlate(data.licensePlate ?? "");
        setVehicleModel(data.vehicleModel ?? "");
      })
      .catch(() => setError("ไม่พบข้อมูลบัญชีคนขับ กรุณาเข้าสู่ระบบใหม่อีกครั้ง"));
  }, []);

  const type = me?.driverType ?? "PUBLIC";
  const docs = DRIVER_TYPES[type].docs;
  const doneCount = docs.filter((k) => files[k] || me?.[k]).length;
  const ready = me && doneCount === docs.length && licensePlate.trim();

  async function submit() {
    if (!ready) return;
    setSubmitting(true);
    setError("");
    try {
      // อัปโหลดเฉพาะใบที่เลือกใหม่ ใบที่ส่งไว้แล้วไม่ต้องส่งซ้ำ (server ใช้ใบเดิมให้)
      const changed = docs.filter((k) => files[k]);
      const refs = await Promise.all(changed.map((k) => uploadDriverDocument(files[k])));
      await api.post("/drivers/me/verify", {
        licensePlate,
        vehicleModel: vehicleModel || undefined,
        ...Object.fromEntries(changed.map((k, i) => [k, refs[i]])),
      });
      navigate("/driver/verify/pending", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "ส่งเอกสารไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TopBar title="ส่งเอกสารคนขับ" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
        {!me && !error && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-brand-600" aria-label="กำลังโหลด" />}
        {me && (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-700">สมัครในฐานะ{DRIVER_TYPES[type].label}</p>
                <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-slate-900">แนบเอกสารให้ครบ</h1>
              </div>
              <p className="tabular flex-none text-right text-slate-900" aria-live="polite">
                <span className="text-3xl font-bold">{doneCount}</span>
                <span className="text-lg font-bold text-slate-500">/{docs.length}</span>
              </p>
            </div>
            {me.rejectionReason && me.verificationStatus === "REJECTED" && (
              <p className="mt-3 rounded-xl bg-here-soft px-3 py-2.5 text-sm text-here">
                <span className="font-bold">แอดมินขอให้แก้:</span> {me.rejectionReason}
              </p>
            )}

            <ul className="mt-5 flex flex-col gap-3">
              {docs.map((k) => (
                <DocTile
                  key={k}
                  info={docInfo(type, k)}
                  file={files[k]}
                  existing={me[k]}
                  onPick={(f) => f && setFiles((prev) => ({ ...prev, [k]: f }))}
                />
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-900">ข้อมูลรถ</h2>
              <Input label="ป้ายทะเบียน" maxLength={40} value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
              <Input label="รุ่นรถ (ไม่บังคับ)" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
            </div>

            <p className="mt-5 flex items-start gap-2 text-sm text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-brand-600" aria-hidden="true" />
              เอกสารใช้ยืนยันตัวตนเพื่อความปลอดภัยของผู้โดยสาร แอดมินของพื้นที่เป็นผู้ตรวจ
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
            {error}
          </p>
        )}
      </main>
      <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
        <Button onClick={submit} disabled={submitting || !ready}>
          {submitLabel({ submitting, ready, remaining: docs.length - doneCount })}
        </Button>
      </div>
    </div>
  );
}
function docHint({ done, file, hint }) {
  if (!done) return hint;
  return file ? "แนบแล้ว แตะเพื่อเปลี่ยน" : "ส่งไว้แล้ว แตะเพื่อเปลี่ยน";
}

function submitLabel({ submitting, ready, remaining }) {
  if (submitting) return "กำลังส่ง...";
  return ready ? "ส่งให้แอดมินตรวจ" : `แนบอีก ${remaining} รายการ`;
}
