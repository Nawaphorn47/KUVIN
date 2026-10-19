import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Lock, Phone, SendHorizontal, ShieldAlert } from "lucide-react";
import clsx from "clsx";
import Avatar from "../../components/ui/Avatar";
import { useTripChat } from "../../lib/useTripChat";

const BODY_MAX = 300; // ตรงกับ chat.service.js ฝั่ง API

// ข้อความสำเร็จรูป — ตอบได้ด้วยนิ้วเดียวตอนขี่/ยืนรอกลางแดด
const QUICK = {
  user: ["รออยู่ที่จุดรับแล้ว", "ขอเวลาอีกแป๊บนะ", "ตอนนี้อยู่ตรงไหนแล้ว?", "ขอบคุณมาก!"],
  driver: ["ถึงจุดรับแล้ว", "อีก 2 นาทีถึง", "รออยู่ตรงไหน?", "รถติดนิดหน่อย รอแป๊บ"],
};

const clock = (iso) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

// แชตในทริประหว่างผู้โดยสารกับคนขับ (หน้าเดียวใช้ทั้งสองโหมด) — state.request = ทริปที่กำลังดำเนินอยู่
export default function TripChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const { messages, open, send, myRole } = useTripChat(request?.id, { reading: true });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages?.length]);

  if (!request?.id) return <Navigate to="/" replace />;

  const other = myRole === "driver" ? request.user : request.driver;
  const otherName = other?.fullName ?? (myRole === "driver" ? "ผู้โดยสาร" : "คนขับ");
  const lastMine = [...(messages ?? [])].reverse().find((m) => m.senderRole === myRole);

  async function submit(body) {
    const value = body.trim();
    if (!value || sending) return;
    setSending(true);
    setError("");
    try {
      await send(value);
      setText("");
    } catch (err) {
      setError(err.response?.data?.message || "ส่งไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
      <header className="flex flex-none items-center gap-3 bg-brand-600 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="ย้อนกลับ"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white/15 active:bg-white/25"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Avatar initial={otherName[0]} size="sm" className="border-2 border-white bg-brand-700 text-white" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold leading-tight">{otherName}</h1>
          <p className="tabular truncate text-sm text-brand-100">
            {myRole === "driver" ? request.destinationAddress && `ไป ${request.destinationAddress}` : request.driver?.licensePlate}
          </p>
        </div>
        {other?.phone && (
          <a
            href={`tel:${other.phone}`}
            aria-label={`โทรหา ${otherName}`}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white text-brand-700 shadow-sticker"
          >
            <Phone className="h-5 w-5" />
          </a>
        )}
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
        <p className="mx-auto mb-4 flex max-w-xs items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">
          <ShieldAlert className="h-4 w-4 flex-none text-slate-500" aria-hidden="true" />
          แชตนี้ถูกเก็บไว้ในระบบ อย่าส่งรหัส OTP เลขบัญชี หรือรหัสผ่านให้ใครในแชต
        </p>

        {messages === null && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-brand-600" aria-label="กำลังโหลดข้อความ" />}
        {messages?.length === 0 && (
          <p className="my-8 text-center text-[15px] text-slate-600">ยังไม่มีข้อความ ทักไปก่อนได้เลย</p>
        )}

        <ol className="flex flex-col gap-1.5">
          {messages?.map((m, i) => {
            const mine = m.senderRole === myRole;
            const groupEnd = messages[i + 1]?.senderRole !== m.senderRole;
            return (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className={clsx("flex flex-col", mine ? "items-end" : "items-start", groupEnd && "mb-2")}
              >
                <p
                  className={clsx(
                    "max-w-[78%] whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-snug",
                    mine
                      ? "rounded-2xl rounded-br-md bg-brand-600 text-white"
                      : "rounded-2xl rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200"
                  )}
                >
                  {m.body}
                </p>
                {groupEnd && (
                  <span className="tabular mt-0.5 px-1 text-xs text-slate-500">
                    {clock(m.createdAt)}
                    {mine && m.id === lastMine?.id && m.readAt && " · อ่านแล้ว"}
                  </span>
                )}
              </motion.li>
            );
          })}
        </ol>
        <div ref={endRef} />
      </main>

      {open ? (
        <div className="flex-none border-t border-slate-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-2">
            {(QUICK[myRole] ?? QUICK.user).map((q) => (
              <button
                key={q}
                type="button"
                disabled={sending}
                onClick={() => submit(q)}
                className="h-9 flex-none rounded-full bg-brand-50 px-3.5 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="mb-2 rounded-lg bg-here-soft px-3 py-2 text-sm font-medium text-here">
              {error}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(text);
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="chat-input" className="sr-only">
              พิมพ์ข้อความถึง {otherName}
            </label>
            <textarea
              id="chat-input"
              rows={1}
              value={text}
              maxLength={BODY_MAX}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(text);
                }
              }}
              placeholder="พิมพ์ข้อความ..."
              className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-[15px] text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-600"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-label="ส่งข้อความ"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-600 text-white shadow-sticker transition-transform active:scale-90 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
            </button>
          </form>
        </div>
      ) : (
        <p className="flex flex-none items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
          <Lock className="h-4 w-4" aria-hidden="true" /> ทริปนี้จบแล้ว แชตปิดแล้ว ดูย้อนหลังได้อย่างเดียว
        </p>
      )}
    </div>
  );
}
