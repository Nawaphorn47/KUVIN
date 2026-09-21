import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Screen from "../../components/layout/Screen";
import Avatar from "../../components/ui/Avatar";
import RatingStars from "../../components/ui/RatingStars";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";

export default function Rating() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!request) {
    navigate("/home");
    return null;
  }
  const driver = request.driver;

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/service-requests/${request.id}/rating`, { score, comment: comment || undefined });
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "ส่งคะแนนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <Screen className="items-center gap-6 pt-10 text-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ให้คะแนนการเดินทาง</h1>
        <p className="mt-1 text-sm text-slate-500">คะแนนของคุณช่วยพัฒนาบริการ</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Avatar initial={driver.fullName[0]} size="xl" />
        <p className="text-lg font-bold text-slate-900">{driver.fullName}</p>
        <p className="text-sm text-slate-500">
          {driver.vinNumber} · {driver.vehicleModel}
        </p>
      </div>

      <RatingStars value={score} onChange={setScore} />

      <div className="w-full text-left">
        <p className="mb-1.5 text-sm font-semibold text-slate-700">
          ความคิดเห็นเพิ่มเติม (ไม่บังคับ)
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="แสดงความคิดเห็นเกี่ยวกับการเดินทางครั้งนี้..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "กำลังส่งคะแนน..." : "ส่งคะแนน"}
      </Button>
      <button onClick={() => navigate("/home")} className="text-sm text-slate-400">
        ข้ามไปก่อน
      </button>
    </Screen>
  );
}
