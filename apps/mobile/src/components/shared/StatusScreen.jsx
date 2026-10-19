import clsx from "clsx";

// หน้าแจ้งสถานะเต็มจอ (ตรวจเอกสาร ผ่าน/ไม่ผ่าน) — หัวป้ายสีแบรนด์พร้อมสติกเกอร์สถานะ เนื้อหา และปุ่มด้านล่างตำแหน่งเดิม
// tone: "wait" (พื้นแบรนด์) | "ok" (พื้นแบรนด์ + ติ๊ก) | "bad" (พื้นแดง — แดงสงวนไว้ให้สถานะวิกฤต)
export default function StatusScreen({ tone = "wait", icon: Icon, title, text, actions, children }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <header className={clsx("flex-none px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))] text-white", tone === "bad" ? "bg-here" : "bg-brand-600")}>
        <span
          aria-hidden="true"
          className={clsx(
            "flex h-16 w-16 -rotate-6 items-center justify-center rounded-full border-4 border-white shadow-sticker",
            tone === "bad" ? "bg-white text-here" : "bg-brand-700 text-white"
          )}
        >
          <Icon className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-[1.75rem] font-bold leading-tight tracking-tight">{title}</h1>
        {text && <p className={clsx("mt-1 text-[15px]", tone === "bad" ? "text-white" : "text-brand-100")}>{text}</p>}
      </header>
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5">{children}</main>
      <div className="flex flex-none flex-col gap-1 border-t border-slate-200 bg-white px-4 py-3">{actions}</div>
    </div>
  );
}
