import { useState } from "react";
import { Bot, Send, User2 } from "lucide-react";
import TopBar from "../../components/layout/TopBar";

const quickTopics = ["พฤติกรรมคนขับ", "ลืมของบนรถ", "ปัญหาการชำระเงิน", "อื่นๆ"];

const initialMessages = [
  {
    from: "bot",
    text: "สวัสดีครับ ผมคือผู้ช่วย KU-VIN ยินดีให้บริการครับ วันนี้มีอะไรให้ช่วยไหมครับ?",
    time: "10:00 AM",
  },
];

export default function Chatbot() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");

  function send(text) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { from: "user", text, time: "10:02 AM" }]);
    setDraft("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: "ได้เลยครับ รบกวนแจ้งรายละเอียดเพิ่มเติม พร้อมหมายเลขทะเบียนรถหรือรหัสการจอง เพื่อให้ผมประสานงานต่อให้ครับ",
          time: "10:02 AM",
        },
      ]);
    }, 700);
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

        {messages.length === 1 && (
          <div className="mt-4 flex flex-wrap gap-2 pl-10">
            {quickTopics.map((t) => (
              <button
                key={t}
                onClick={() => send(t)}
                className="rounded-full bg-white px-4 py-2 text-sm text-emerald-600 shadow-card"
              >
                {t}
              </button>
            ))}
          </div>
        )}
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
          placeholder="พิมพ์ข้อความที่นี่..."
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
