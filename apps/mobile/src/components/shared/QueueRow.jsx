import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hash, Zap, Clock } from "lucide-react";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";

export default function QueueRow({ row, activeOffer }) {
  return (
    <Card
      className={`flex flex-col gap-2 shadow-none ${row.isMe ? "ring-2 ring-emerald-500" : "ring-slate-100"}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
          {row.position}
        </span>
        <Avatar initial={row.fullName[0]} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {row.fullName} {row.isMe && <span className="text-emerald-600">(คุณ)</span>}
          </p>
          <p className="flex items-center gap-1 text-xs text-slate-400">
            <Hash className="h-3 w-3" /> เบอร์วิน {row.vinNumber}
          </p>
        </div>
      </div>
      {row.isActiveOffer && <OfferBadge offerExpiresAt={activeOffer?.offerExpiresAt} />}
    </Card>
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
      animate={{ opacity: [1, 0.6, 1] }}
      transition={{ repeat: Infinity, duration: 1.2 }}
      className="flex w-fit items-center gap-1 self-start rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600"
    >
      <Zap className="h-3 w-3" /> กำลังเสนองาน
      {remaining != null && (
        <span className="flex items-center gap-0.5 text-red-500">
          <Clock className="h-3 w-3" /> {remaining}s
        </span>
      )}
    </motion.span>
  );
}

function secondsLeft(offerExpiresAt) {
  if (!offerExpiresAt) return null;
  return Math.max(0, Math.ceil((new Date(offerExpiresAt).getTime() - Date.now()) / 1000));
}
