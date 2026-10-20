import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizontal } from "lucide-react";
import clsx from "clsx";
import TopBar from "../../components/layout/TopBar";
import { emergencyContactsFor } from "../../lib/emergencyContacts";
import { useArea } from "../../context/AreaContext";

// ผู้ช่วยตอบคำถามที่พบบ่อย (FAQ) — ตอบจากกติกาจริงของระบบเท่านั้น ไม่มีเจ้าหน้าที่อ่านข้อความนี้อยู่เบื้องหลัง
// (เดิมตอบข้อความเดิมทุกครั้งว่า "จะประสานงานต่อให้" ทั้งที่ข้อความไม่ได้ส่งไปหาใครเลย = ผู้ใช้เข้าใจผิดว่าแจ้งเรื่องแล้ว)
// ค่าโดยสารและเบอร์ฉุกเฉินมาจากพื้นที่ที่เลือกอยู่ (แต่ละพื้นที่ตั้งเองในหน้าแอดมิน)
function buildFaq(area) {
  const contacts = emergencyContactsFor(area);
  const security = contacts.find((c) => c.label.startsWith("รปภ.")) ?? contacts[0];
  const emergencyLine = contacts.map((c) => `${c.label} ${c.phone}`).join(" · ");
  const fares = area
    ? `ในเขต${area.displayName}เหมาจ่าย ${area.flatFare} บาท ถ้าต้นทางหรือปลายทางอยู่นอกเขตคิด ${area.ratePerKm} บาทต่อกิโลเมตรตามระยะทางถนนจริง ขั้นต่ำ ${area.minFare} บาท`
    : "ค่าโดยสารขึ้นกับพื้นที่ที่ใช้บริการ";

  const faq = [
    {
      topic: "วิธีเรียกวิน",
      keywords: ["เรียก", "จอง", "ใช้งาน", "ยังไง", "วิธี"],
      answer:
        "ที่หน้าแรกแตะเลขปลายทางบนแผนผังหรือในรายการ แล้วกดปุ่ม “เรียกวินไป…” หรือกดช่องค้นหาเพื่อเลือกที่อื่น/ปักหมุดเอง ตรวจจุดรับ (กดค้างที่วงสีแล้วลากเพื่อปรับ) แล้วกด “เรียกวินเลย” ระบบจะเสนองานให้คนขับตามคิวทีละคน เมื่อมีคนรับจะเห็นชื่อ เลขเสื้อวิน ป้ายทะเบียน และตำแหน่งคนขับบนแผนที่ครั้งแรกที่เรียกต้องยืนยันเบอร์ด้วย OTP และถ่ายเซลฟี่ก่อน",
    },
    {
      topic: "ค่าโดยสาร",
      keywords: ["ค่าโดยสาร", "ราคา", "กี่บาท", "ค่ารถ", "แพง", "ค่าวิน"],
      answer: `${fares} ดูราคาก่อนยืนยันได้ที่หน้า “เช็กก่อนเรียก”`,
    },
    {
      topic: "ปัญหาการชำระเงิน",
      keywords: ["จ่าย", "ชำระ", "สลิป", "โอน", "พร้อมเพย์", "เงิน", "qr"],
      answer:
        "จ่ายได้ 2 แบบ: เงินสดกับคนขับ หรือสแกน QR พร้อมเพย์ของคนขับแล้วแนบสลิปในแอป (ถ้าเปิดตรวจสลิปอัตโนมัติอยู่) ถ้าสลิปไม่ผ่านจะบอกเหตุผลและส่งใหม่ได้ ถ้ายังมีปัญหาจ่ายเงินสดแล้วให้คนขับกดยืนยันการรับเงินแทนได้",
    },
    {
      topic: "ลืมของบนรถ",
      keywords: ["ลืม", "ของหาย", "หาย", "ทิ้งไว้"],
      answer: `ระหว่างทริปโทรหรือแชตหาคนขับได้ ถ้าทริปจบแล้วเบอร์คนขับจะไม่แสดงอีก ให้เปิด “ทริปของฉัน” แล้วกด “แจ้งปัญหา” เลือกหัวข้อ “ลืมของไว้ในรถ” แอดมินของพื้นที่จะตรวจสอบให้ หรือติดต่อ${security.label} ${security.phone} พร้อมแจ้งเลขเสื้อวินและเวลาเดินทาง`,
    },
    {
      topic: "พฤติกรรมคนขับ",
      keywords: ["คนขับ", "พฤติกรรม", "ร้องเรียน", "ขับเร็ว", "ไม่สุภาพ", "แย่", "คุกคาม"],
      answer:
        "หลังจบทริปให้คะแนนและเลือกแท็กได้ในหน้าให้คะแนน และกด “แจ้งปัญหา” (ที่หน้าจบทริปหรือ “ทริปของฉัน” ภายใน 7 วัน) เพื่อส่งเรื่องถึงแอดมินของพื้นที่ ซึ่งตรวจสอบและระงับบัญชีคนขับได้ ถ้ารู้สึกไม่ปลอดภัยระหว่างทริปกดปุ่ม SOS ทันที",
    },
    {
      topic: "แชร์ทริปให้เพื่อน",
      keywords: ["แชร์", "ส่งลิงก์", "ตามตำแหน่ง", "ครอบครัว", "เพื่อน", "ปลอดภัย"],
      answer:
        "ระหว่างที่คนขับกำลังมารับและระหว่างเดินทาง กดปุ่ม “แชร์ทริปให้คนที่ไว้ใจ” แล้วส่งลิงก์ให้เพื่อนหรือครอบครัว เขาเปิดดูตำแหน่งสด ชื่อเล่นคนขับ และป้ายทะเบียนได้โดยไม่ต้องลงแอป ลิงก์หมดอายุใน 6 ชั่วโมงและหยุดแสดงตำแหน่งเมื่อจบทริป",
    },
    {
      topic: "เหตุฉุกเฉิน",
      keywords: ["ฉุกเฉิน", "sos", "อุบัติเหตุ", "ช่วย", "อันตราย", "เจ็บ"],
      answer: `ระหว่างทริปกดปุ่ม SOS (กดค้างสั้นๆ) ระบบจะส่งตำแหน่งของคุณให้แอดมินของพื้นที่ทันที หรือโทรเบอร์ฉุกเฉิน: ${emergencyLine}`,
    },
  ];

  const fallback =
    "ขออภัย ผู้ช่วยตอบได้เฉพาะหัวข้อด้านล่าง และไม่มีเจ้าหน้าที่อ่านข้อความในหน้านี้ ถ้าเป็นเรื่องด่วนกรุณาโทร " +
    `${security.label} ${security.phone}`;

  return { faq, fallback };
}

function now() {
  return new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function answerFor({ faq, fallback }, text) {
  const q = text.toLowerCase();
  const hit = faq.find((f) => f.topic === text) ?? faq.find((f) => f.keywords.some((k) => q.includes(k)));
  return hit ? hit.answer : fallback;
}

export default function Chatbot() {
  const { area } = useArea();
  const knowledge = buildFaq(area);
  const FAQ = knowledge.faq;
  const [messages, setMessages] = useState(() => [
    {
      id: nextMessageId(),
      from: "bot",
      text: "สวัสดีครับ ผมคือผู้ช่วยตอบคำถามของ KU VIN เลือกหัวข้อด้านล่าง หรือพิมพ์คำถามได้เลยครับ",
      time: now(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function send(text) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { id: nextMessageId(), from: "user", text, time: now() }, { id: nextMessageId(), from: "bot", text: answerFor(knowledge, text), time: now() }]);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
      <TopBar title="ถามผู้ช่วย" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
        <p className="mx-auto mb-4 max-w-xs rounded-xl bg-white/70 px-3 py-2 text-center text-xs text-slate-600">
          ตอบจากกติกาของระบบอัตโนมัติ ไม่มีเจ้าหน้าที่อ่านข้อความในหน้านี้
        </p>
        <ol className="flex flex-col gap-3">
          {messages.map((m) => {
            const mine = m.from === "user";
            return (
              <li key={m.id} className={clsx("flex flex-col", mine ? "items-end" : "items-start")}>
                <div className={clsx("flex max-w-[85%] items-end gap-2", mine && "flex-row-reverse")}>
                  {!mine && (
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-600 text-white">
                      <Bot className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                  <p
                    className={clsx(
                      "whitespace-pre-wrap px-3.5 py-2.5 text-[15px] leading-snug",
                      mine ? "rounded-2xl rounded-br-md bg-brand-600 text-white" : "rounded-2xl rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200"
                    )}
                  >
                    {m.text}
                  </p>
                </div>
                <span className="tabular mt-0.5 px-1 text-xs text-slate-500">{m.time}</span>
              </li>
            );
          })}
        </ol>
        <div ref={bottom} />
      </main>

      <div className="flex-none border-t border-slate-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {/* หัวข้อให้กดได้ตลอด ไม่ใช่แค่ข้อความแรก — ถามต่อได้โดยไม่ต้องพิมพ์ */}
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-2">
          {FAQ.map((f) => (
            <button
              key={f.topic}
              type="button"
              onClick={() => send(f.topic)}
              className="h-9 flex-none rounded-full bg-brand-50 px-3.5 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 active:scale-95"
            >
              {f.topic}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="faq-input" className="sr-only">
            พิมพ์คำถาม
          </label>
          <input
            id="faq-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="พิมพ์คำถามที่นี่..."
            className="h-11 min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-600"
          />
          <button
            type="submit"
            aria-label="ส่งคำถาม"
            disabled={!draft.trim()}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-600 text-white shadow-sticker transition-transform active:scale-90 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
let messageSeq = 0;
function nextMessageId() {
  messageSeq += 1;
  return messageSeq;
}
