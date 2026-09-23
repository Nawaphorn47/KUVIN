import { useEffect, useRef, useState } from "react";
import { Bot, Send, User2 } from "lucide-react";
import TopBar from "../../components/layout/TopBar";
import { emergencyContacts } from "../../lib/emergencyContacts";

// ผู้ช่วยตอบคำถามที่พบบ่อย (FAQ) — ตอบจากกติกาจริงของระบบเท่านั้น ไม่มีเจ้าหน้าที่อ่านข้อความนี้อยู่เบื้องหลัง
// (เดิมตอบข้อความเดิมทุกครั้งว่า "จะประสานงานต่อให้" ทั้งที่ข้อความไม่ได้ส่งไปหาใครเลย = ผู้ใช้เข้าใจผิดว่าแจ้งเรื่องแล้ว)
// ถ้าแก้อัตราค่าโดยสารใน apps/api/src/utils/geo.js ต้องแก้คำตอบ "ค่าโดยสาร" ตรงนี้ให้ตรงกันด้วย
const security = emergencyContacts.find((c) => c.label.startsWith("รปภ."));
const emergencyLine = emergencyContacts.map((c) => `${c.label} ${c.phone}`).join(" · ");

const FAQ = [
  {
    topic: "วิธีเรียกวิน",
    keywords: ["เรียก", "จอง", "ใช้งาน", "ยังไง", "วิธี"],
    answer:
      "กดช่อง \"ไปไหน? ค้นหาปลายทาง\" ที่หน้าแรก เลือกสถานที่หรือปักหมุดบนแผนที่ ตรวจจุดรับ (ลากหมุดสีเขียวปรับได้) แล้วกด ยืนยันการเรียกวิน ระบบจะเสนองานให้คนขับตามคิวทีละคน เมื่อมีคนรับจะเห็นชื่อ เบอร์วิน ทะเบียน และตำแหน่งคนขับบนแผนที่",
  },
  {
    topic: "ค่าโดยสาร",
    keywords: ["ค่าโดยสาร", "ราคา", "กี่บาท", "ค่ารถ", "แพง"],
    answer:
      "ในมหาวิทยาลัยเหมาจ่าย 20 บาท ถ้าต้นทางหรือปลายทางอยู่นอกมหาวิทยาลัยคิด 10 บาทต่อกิโลเมตรตามระยะทางถนนจริง ขั้นต่ำ 20 บาท ดูราคาก่อนยืนยันได้ที่หน้ายืนยันการเรียกวิน",
  },
  {
    topic: "ปัญหาการชำระเงิน",
    keywords: ["จ่าย", "ชำระ", "สลิป", "โอน", "พร้อมเพย์", "เงิน", "qr"],
    answer:
      "จ่ายได้ 2 แบบ: เงินสดกับคนขับ หรือสแกน QR พร้อมเพย์ของคนขับแล้วแนบสลิปในแอป ระบบตรวจสลิปให้อัตโนมัติ ถ้าไม่ผ่านจะบอกเหตุผลและส่งใหม่ได้ (เช่น สลิปไม่ชัด ยอดไม่ตรง) ถ้ายังมีปัญหาจ่ายเงินสดแล้วให้คนขับกดยืนยันการรับเงินแทนได้",
  },
  {
    topic: "ลืมของบนรถ",
    keywords: ["ลืม", "ของหาย", "หาย", "ทิ้งไว้"],
    answer: `ถ้าคนขับยังมารับหรือยังอยู่ในทริป กดปุ่มโทรหาคนขับได้เลย ถ้าทริปจบแล้ว ติดต่อ${security.label} ${security.phone} พร้อมแจ้งเบอร์วินและเวลาเดินทาง (ดูได้ที่หน้าประวัติการเดินทาง)`,
  },
  {
    topic: "พฤติกรรมคนขับ",
    keywords: ["คนขับ", "พฤติกรรม", "ร้องเรียน", "ขับเร็ว", "ไม่สุภาพ", "แย่"],
    answer:
      "หลังจบทริปให้คะแนนและเขียนความคิดเห็นได้ในหน้าให้คะแนน ผู้ดูแลระบบเห็นคะแนนของคนขับทุกคนและระงับบัญชีคนขับได้ ถ้ารู้สึกไม่ปลอดภัยระหว่างทริป กดปุ่ม SOS บนหน้าแผนที่ทันที",
  },
  {
    topic: "เหตุฉุกเฉิน",
    keywords: ["ฉุกเฉิน", "sos", "อุบัติเหตุ", "ช่วย", "อันตราย", "เจ็บ"],
    answer: `ระหว่างทริปกดปุ่ม SOS บนหน้าแผนที่ ระบบจะส่งตำแหน่งของคุณให้ผู้ดูแลระบบทันที หรือโทรเบอร์ฉุกเฉิน: ${emergencyLine}`,
  },
];

const FALLBACK =
  "ขออภัย ผู้ช่วยตอบได้เฉพาะคำถามที่พบบ่อยด้านล่าง และไม่มีเจ้าหน้าที่อ่านข้อความในหน้านี้ ถ้าเป็นเรื่องด่วนกรุณาโทร " +
  `${security.label} ${security.phone}`;

function now() {
  return new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function answerFor(text) {
  const q = text.toLowerCase();
  const hit = FAQ.find((f) => f.topic === text) ?? FAQ.find((f) => f.keywords.some((k) => q.includes(k)));
  return hit ? hit.answer : FALLBACK;
}

export default function Chatbot() {
  const [messages, setMessages] = useState(() => [
    {
      from: "bot",
      text: "สวัสดีครับ ผมคือผู้ช่วยตอบคำถามของ KU VIN เลือกหัวข้อด้านล่าง หรือพิมพ์คำถามได้เลยครับ",
      time: now(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { from: "user", text, time: now() }, { from: "bot", text: answerFor(text), time: now() }]);
    setDraft("");
  }

  return (
    <div className="flex flex-1 flex-col bg-stone-50">
      <TopBar title="KU-VIN Helper" />
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${m.from === "user" ? "flex-row-reverse" : ""}`}
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-200 text-slate-600">
                {m.from === "user" ? <User2 className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>
              <div className={`flex max-w-[75%] flex-col gap-1 ${m.from === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={
                    m.from === "user"
                      ? "rounded-tl-2xl rounded-bl-2xl rounded-br-2xl bg-emerald-600 px-4 py-3 text-sm text-white"
                      : "rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-card"
                  }
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-slate-400">{m.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* หัวข้อให้กดได้ตลอด ไม่ใช่แค่ข้อความแรก — ถามต่อได้โดยไม่ต้องพิมพ์ */}
        <div className="mt-4 flex flex-wrap gap-2 pl-10">
          {FAQ.map((f) => (
            <button
              key={f.topic}
              onClick={() => send(f.topic)}
              className="rounded-full bg-white px-4 py-2 text-sm text-emerald-600 shadow-card"
            >
              {f.topic}
            </button>
          ))}
        </div>
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-3 border-t border-slate-200 bg-white/80 p-4 backdrop-blur"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="พิมพ์คำถามที่นี่..."
          className="h-12 flex-1 rounded-full bg-slate-100 px-5 text-sm outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-emerald-600 text-white shadow-floating"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
