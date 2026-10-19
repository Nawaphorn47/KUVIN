import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import clsx from "clsx";
import Avatar from "../../components/ui/Avatar";
import RatingStars from "../../components/ui/RatingStars";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";

const COMMENT_MAX = 500; // ตรงกับฝั่ง API (serviceRequest.service.js)
const SCORE_WORDS = ["", "แย่มาก", "ไม่ค่อยดี", "พอใช้", "ดีเลย", "สุดยอด!"];

// แท็กสั้น ๆ ให้กดแทนการพิมพ์ — เก็บเป็นส่วนหนึ่งของความคิดเห็น เพื่อใช้สรุปฟีดแบ็กของคนขับแต่ละคน
const GOOD_TAGS = ["ขับปลอดภัย", "มาตรงเวลา", "สุภาพ", "รู้ทางดี"];
const BAD_TAGS = ["ขับเร็วไป", "รอนาน", "ไม่ตรงจุดรับ", "ไม่สุภาพ"];

export default function Rating() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [score, setScore] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!request) return <Navigate to="/home" replace />;
  const driver = request.driver;
  const tagSet = score >= 4 ? GOOD_TAGS : BAD_TAGS;

  function changeScore(next) {
    // เปลี่ยนจากดีเป็นแย่ (หรือกลับกัน) แท็กชุดเดิมไม่ตรงความหมายแล้ว
    if ((next >= 4) !== (score >= 4)) setTags([]);
    setScore(next);
  }

  function toggle(tag) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    const text = [tags.length ? tags.map((t) => `#${t}`).join(" ") : "", comment.trim()].filter(Boolean).join("\n");
    try {
      await api.post(`/service-requests/${request.id}/rating`, { score, comment: text || undefined });
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "ส่งคะแนนไม่สำเร็จ ลองกดส่งอีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex flex-col items-center text-center">
          <Avatar initial={driver.fullName[0]} size="xl" />
          <p className="mt-3 text-sm text-slate-600">เที่ยวนี้กับ</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{driver.fullName}</h1>
          <p className="tabular text-sm text-slate-600">
            {[driver.vinNumber && `เสื้อเบอร์ ${driver.vinNumber}`, driver.vehicleModel].filter(Boolean).join(" · ")}
          </p>
        </div>

        <section aria-labelledby="score-title" className="mt-6 flex flex-col items-center gap-2">
          <h2 id="score-title" className="sr-only">
            คะแนน
          </h2>
          <RatingStars value={score} onChange={changeScore} size={40} />
          <p className="text-lg font-bold text-slate-900" aria-live="polite">
            {SCORE_WORDS[score]}
          </p>
        </section>

        <section aria-labelledby="tags-title" className="mt-5">
          <h2 id="tags-title" className="mb-2 text-sm font-semibold text-slate-600">
            {score >= 4 ? "ชอบอะไรบ้าง" : "ติดตรงไหน"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {tagSet.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(tag)}
                  className={clsx(
                    "h-10 rounded-full px-4 text-sm font-bold transition-all active:scale-95",
                    on ? "-rotate-2 bg-brand-600 text-white shadow-sticker" : "bg-white text-slate-700 ring-1 ring-slate-300"
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-5">
          <label htmlFor="rating-comment" className="mb-1.5 block text-sm font-semibold text-slate-600">
            อยากบอกอะไรเพิ่ม (ไม่บังคับ)
          </label>
          <textarea
            id="rating-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX - 60))}
            rows={3}
            placeholder="เช่น จุดรับหายาก หรือคนขับใจดีมาก"
            className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-500"
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
            {error}
          </p>
        )}
      </main>
      <div className="flex flex-none flex-col gap-1 border-t border-slate-200 bg-white px-4 py-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "กำลังส่ง..." : "ส่งคะแนน"}
        </Button>
        <Button variant="ghost" onClick={() => navigate("/home")}>
          ข้ามไปก่อน
        </Button>
      </div>
    </div>
  );
}
