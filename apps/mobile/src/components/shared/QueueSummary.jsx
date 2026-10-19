// สรุปสถานะคิวของตัวเองเป็นตัวเลขใหญ่หนึ่งตัว — ใช้ทั้งหน้าหลักและหน้าคิวทั้งหมด
// ลำดับความสำคัญบอกด้วยขนาดล้วน: เลขลำดับใหญ่สุด ข้อความรองเล็กลงมา
export function queueState(overview) {
  if (overview.myPosition == null) {
    return { big: "–", label: "ยังไม่พบคุณในคิว", hint: "รอสักครู่ ระบบกำลังนำคุณเข้าคิว", hot: false };
  }
  const mine = overview.queue.find((q) => q.isMe);
  if (mine?.isActiveOffer) {
    return { big: overview.myPosition, label: "ถึงคิวคุณแล้ว", hint: "ตอบรับงานที่เสนอ ภายในเวลาที่กำหนด", hot: true };
  }
  if (overview.aheadOfMe === 0) {
    return { big: overview.myPosition, label: "คุณอยู่หัวคิว", hint: "งานใหม่เข้ามาเมื่อไหร่ ระบบเสนอให้คุณก่อน", hot: true };
  }
  return {
    big: overview.myPosition,
    label: `อีก ${overview.aheadOfMe} คิวถึงตาคุณ`,
    hint: `จากคนขับออนไลน์ ${overview.queue.length} คน`,
    hot: false,
  };
}

export default function QueueSummary({ overview }) {
  const s = queueState(overview);
  return (
    <section aria-label="ลำดับคิวของคุณ" aria-live="polite" className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className={`tabular flex h-20 w-20 flex-none -rotate-3 items-center justify-center rounded-full border-4 border-white text-5xl font-bold shadow-sticker ${
          s.hot ? "bg-here text-white" : "bg-white text-brand-700"
        }`}
      >
        {s.big}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight text-white">{s.label}</p>
        <p className="mt-0.5 text-sm text-brand-100">{s.hint}</p>
      </div>
    </section>
  );
}
