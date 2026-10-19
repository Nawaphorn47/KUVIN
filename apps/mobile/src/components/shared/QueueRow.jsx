import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Zap } from "lucide-react";
import clsx from "clsx";
import StopNumber from "../ui/StopNumber";

// แถวในคิวรับงาน: ลำดับเป็นเลขสติกเกอร์ (ชุดเดียวกับหมุดเลขบนแผนผังฝั่งผู้โดยสาร) แถวของตัวเองเด่นด้วยพื้นสีแบรนด์
export default function QueueRow({ row, activeOffer }) {
  return (
    <li className={clsx("border-b border-slate-200 last:border-b-0", row.isMe && "bg-brand-50")}>
      <div className="flex items-center gap-3 px-3 py-3">
        <StopNumber n={row.position} selected={row.isMe} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-slate-900">
            {row.fullName}
            {row.isMe && <span className="ml-1.5 text-brand-700">(คุณ)</span>}
          </p>
          <p className="tabular text-sm text-slate-600">เสื้อวินเบอร์ {row.vinNumber}</p>
        </div>
        {row.isActiveOffer && <OfferBadge offerExpiresAt={activeOffer?.offerExpiresAt} />}
      </div>
    </li>
  );
}

function OfferBadge({ offerExpiresAt }) {
  const [remaining, setRemaining] = useState(secondsLeft(offerExpiresAt));

  useEffect(() => {
    const t = setInterval(() => setRemaining(secondsLeft(offerExpiresAt)), 1000);
    return () => clearInterval(t);
  }, [offerExpiresAt]);

  return (
    <motion.span
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 1.2 }}
      className="tabular flex flex-none items-center gap-1 rounded-md bg-here-soft px-2 py-1 text-sm font-bold text-here"
    >
      <Zap className="h-4 w-4" aria-hidden="true" /> กำลังเสนองาน
      {remaining != null && (
        <span className="flex items-center gap-0.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {remaining}
        </span>
      )}
    </motion.span>
  );
}

function secondsLeft(offerExpiresAt) {
  if (!offerExpiresAt) return null;
  return Math.max(0, Math.ceil((new Date(offerExpiresAt).getTime() - Date.now()) / 1000));
}
