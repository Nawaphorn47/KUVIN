import { Check } from "lucide-react";
import clsx from "clsx";

// ขั้นของทริปฝั่งผู้โดยสาร — index ตรงกับ stage ที่หน้าแต่ละหน้าส่งมา
const STAGES = [
  { label: "เรียกวินแล้ว", at: "requestedAt" },
  { label: "คนขับรับงาน", at: "acceptedAt" },
  { label: "ออกเดินทาง" },
  { label: "ถึงปลายทาง", at: "completedAt" },
];

const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : null);

// เครื่องหมายบนแกน: ทึบ = ผ่านแล้ว, วงแหวนกระเพื่อม = ตอนนี้, กลวง = ยังไม่ถึง (แยกได้แม้ไม่เห็นสี)
function Mark({ state }) {
  if (state === "done") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
        <Check className="h-3 w-3" strokeWidth={3.5} />
      </span>
    );
  }
  if (state === "now") {
    return (
      <span className="relative flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-brand-600 bg-white">
        <span className="absolute -inset-1.5 animate-pulse-ring rounded-full bg-brand-400/40" />
        <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
      </span>
    );
  }
  return <span className="block h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />;
}

/**
 * แกนเวลาทริปแนวตั้ง — ขั้นถัดไปอยู่บนสุด ขั้นที่ผ่านแล้วเรียงลงล่าง อยู่ตำแหน่งเดิมทุกหน้าของทริป
 *  - stage : 0 รอคนขับ, 1 คนขับกำลังมา, 2 กำลังเดินทาง, 3 ถึงแล้ว (4 = จบครบทุกขั้น)
 *  - request : ใช้ที่อยู่จุดรับ/ปลายทางและเวลาของแต่ละขั้น
 *  - now : ข้อความเสริมของขั้นปัจจุบัน (เช่น เวลาโดยประมาณ)
 */
export default function TripRail({ stage, request, now }) {
  const notes = [
    `รับที่ ${request?.pickupAddress ?? "จุดนัดพบ"}`,
    null,
    null,
    `ส่งที่ ${request?.destinationAddress ?? "-"}`,
  ];
  const rows = STAGES.map((s, i) => ({
    ...s,
    i,
    state: i < stage ? "done" : i === stage ? "now" : "next",
    time: clock(s.at && request?.[s.at]),
  })).reverse();

  return (
    <ol aria-label="ความคืบหน้าของทริป" className="flex flex-col">
      {rows.map((r, idx) => (
        <li key={r.label} aria-current={r.state === "now" ? "step" : undefined} className="relative flex gap-3 pb-4 last:pb-0">
          {idx < rows.length - 1 && (
            <span
              aria-hidden="true"
              className={clsx("absolute bottom-0 left-[9.5px] top-5 w-px", r.i <= stage ? "bg-brand-600" : "bg-slate-300")}
            />
          )}
          <span className="relative z-[1] flex flex-none pt-0.5">
            <Mark state={r.state} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p
                className={clsx(
                  r.state === "now" ? "text-lg font-bold text-slate-900" : "text-sm font-semibold",
                  r.state === "next" ? "text-slate-500" : r.state === "done" && "text-slate-700"
                )}
              >
                {r.label}
              </p>
              {r.time && r.state === "done" && <span className="tabular text-xs text-slate-500">{r.time}</span>}
            </div>
            {r.state === "now" && now && <div className="mt-1 text-sm text-slate-600">{now}</div>}
            {notes[r.i] && <p className="mt-0.5 truncate text-sm text-slate-600">{notes[r.i]}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
