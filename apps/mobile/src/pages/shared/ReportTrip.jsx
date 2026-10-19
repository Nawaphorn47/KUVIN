import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Check, Loader2, Siren } from "lucide-react";
import clsx from "clsx";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";
import { getTokenRole } from "../../lib/auth";
import { useAuthConfig } from "../../lib/session";

const DETAIL_MAX = 1000; // ตรงกับ tripSafety.service.js
const dateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

// แจ้งปัญหาหลังทริป (ผู้โดยสารหรือคนขับ) — ส่งถึงแอดมินของพื้นที่ทริปนั้น ใช้ตรวจสอบ/ระงับบัญชี และเก็บเป็นฟีดแบ็ก
// state.request = ทริปที่จะแจ้ง (มาจากหน้าจบทริปหรือประวัติ)
export default function ReportTrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const role = getTokenRole();
  const config = useAuthConfig();
  const [category, setCategory] = useState("");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!request?.id) return <Navigate to="/" replace />;
  const categories = Object.entries(config?.reportCategories?.[role] ?? {});
  const needDetail = category === "OTHER";

  async function submit(e) {
    e.preventDefault();
    if (!category || (needDetail && !detail.trim())) return;
    setSending(true);
    setError("");
    try {
      await api.post(`/service-requests/${request.id}/report`, { category, detail: detail.trim() || undefined });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-1 flex-col bg-slate-50">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="flex h-16 w-16 -rotate-6 items-center justify-center rounded-full bg-brand-600 text-white shadow-sticker">
            <Check className="h-8 w-8" strokeWidth={3} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ส่งถึงแอดมินแล้ว</h1>
          <p className="text-[15px] text-slate-600">เรื่องนี้ขึ้นในหน้าแอดมินของพื้นที่แล้ว เพื่อให้ตรวจสอบต่อ</p>
        </div>
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <Button onClick={() => navigate(role === "driver" ? "/driver/home" : "/home", { replace: true })}>กลับหน้าแรก</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TopBar title="แจ้งปัญหาทริปนี้" />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
          <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            <span className="font-bold text-slate-900">{request.destinationAddress ?? "ทริป"}</span>
            {request.requestedAt && ` · ${dateTime(request.requestedAt)}`}
            {(role === "driver" ? request.user?.fullName : request.driver?.fullName) &&
              ` · ${role === "driver" ? request.user.fullName : request.driver.fullName}`}
          </p>

          <a
            href="tel:191"
            className="mt-3 flex items-center gap-3 rounded-xl bg-here-soft px-4 py-3 text-sm font-semibold text-here"
          >
            <Siren className="h-5 w-5 flex-none" aria-hidden="true" />
            ถ้ากำลังไม่ปลอดภัยตอนนี้ แตะเพื่อโทร 191 ทันที ไม่ต้องรอแอดมิน
          </a>

          <fieldset className="mt-5">
            <legend className="mb-2 text-base font-bold text-slate-900">เกิดอะไรขึ้น?</legend>
            {!config && <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-brand-600" aria-label="กำลังโหลด" />}
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {categories.map(([key, label]) => {
                const on = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setCategory(key)}
                    className={clsx(
                      "h-10 rounded-full px-4 text-sm font-bold transition-all active:scale-95",
                      on ? "-rotate-2 bg-brand-600 text-white shadow-sticker" : "bg-white text-slate-700 ring-1 ring-slate-300"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5">
            <label htmlFor="report-detail" className="mb-1.5 block text-sm font-semibold text-slate-600">
              เล่ารายละเอียด {needDetail ? "(จำเป็น)" : "(ไม่บังคับ)"}
            </label>
            <textarea
              id="report-detail"
              rows={4}
              maxLength={DETAIL_MAX}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="เกิดตอนไหน ตรงไหน อะไรบ้าง ยิ่งละเอียดยิ่งช่วยให้ตรวจสอบได้เร็ว"
              className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-600"
            />
            <p className="tabular mt-1 text-right text-xs text-slate-500">
              {detail.length}/{DETAIL_MAX}
            </p>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
              {error}
            </p>
          )}
        </main>
        <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
          <Button type="submit" disabled={sending || !category || (needDetail && !detail.trim())}>
            {sending ? "กำลังส่ง..." : "ส่งให้แอดมินตรวจสอบ"}
          </Button>
        </div>
      </form>
    </div>
  );
}
