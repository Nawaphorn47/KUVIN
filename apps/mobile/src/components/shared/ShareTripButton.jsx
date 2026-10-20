import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import clsx from "clsx";
import { shareTrip } from "../../lib/shareTrip";

// แชร์ทริปให้คนที่ไว้ใจ (เพื่อน/ครอบครัว) ดูตำแหน่งสด ชื่อคนขับ ป้ายทะเบียน — ไม่ต้องลงแอปก็เปิดได้
export default function ShareTripButton({ request, className }) {
  const [state, setState] = useState("idle"); // idle | busy | done | error
  const [message, setMessage] = useState("");

  async function onClick() {
    setState("busy");
    setMessage("");
    try {
      const result = await shareTrip(request);
      if (result === "cancelled") return setState("idle");
      setState("done");
      setMessage(result === "copied" ? "คัดลอกลิงก์แล้ว ส่งให้คนที่ไว้ใจได้เลย" : "แชร์แล้ว");
      setTimeout(() => setState("idle"), 4000);
    } catch (err) {
      setState("error");
      setMessage(err.response?.data?.message || err.message || "แชร์ไม่สำเร็จ");
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={state === "busy"}
        className={clsx(
          "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors",
          state === "done" ? "bg-brand-600 text-white" : "bg-white text-brand-800 ring-2 ring-brand-600 active:bg-brand-50"
        )}
      >
        {state === "done" ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {state === "busy" ? "กำลังสร้างลิงก์..." : "แชร์ทริปให้คนที่ไว้ใจ"}
      </button>
      {message && (
        <output className={clsx("mt-1.5 block text-sm", state === "error" ? "font-medium text-here" : "text-slate-600")}>
          {message}
        </output>
      )}
    </div>
  );
}
