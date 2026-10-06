import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, MapPinned, X } from "lucide-react";
import clsx from "clsx";
import { useArea } from "../../context/AreaContext";

// ป้ายชื่อพื้นที่บนหัวหน้าจอ — กดแล้วเปิดแผ่นเลือกพื้นที่ (ผู้โดยสารใช้บัญชีเดียวได้ทุกพื้นที่)
// readOnly = โชว์ชื่ออย่างเดียว (คนขับเปลี่ยนพื้นที่เองไม่ได้ เพราะสังกัดคิวของพื้นที่นั้น)
export default function AreaSwitcher({ readOnly = false, tone = "light" }) {
  const { area, areas, setAreaId, loading } = useArea();
  const [open, setOpen] = useState(false);
  const canSwitch = !readOnly && areas.length > 1;

  const label = loading ? "กำลังหาพื้นที่..." : area?.displayName ?? "ยังไม่มีพื้นที่ให้บริการ";

  return (
    <>
      <button
        type="button"
        disabled={!canSwitch}
        onClick={() => setOpen(true)}
        className={clsx(
          "flex max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left text-sm font-semibold",
          tone === "dark" ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-800",
          canSwitch && "active:opacity-80"
        )}
      >
        {area?.logoUrl ? (
          <img src={area.logoUrl} alt="" className="h-7 w-7 flex-none rounded-full bg-white object-cover" />
        ) : (
          <span
            className={clsx(
              "flex h-7 w-7 flex-none items-center justify-center rounded-full",
              tone === "dark" ? "bg-white/20" : "bg-emerald-600 text-white"
            )}
          >
            <MapPinned className="h-4 w-4" />
          </span>
        )}
        <span className="truncate">{label}</span>
        {canSwitch && <ChevronDown className="h-4 w-4 flex-none opacity-70" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[75vh] w-full max-w-[430px] flex-col gap-3 rounded-t-3xl bg-white p-5"
              role="dialog"
              aria-label="เลือกพื้นที่ให้บริการ"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">เลือกพื้นที่ให้บริการ</h2>
                  <p className="text-xs text-slate-500">ราคา สถานที่ และเบอร์ฉุกเฉินจะเปลี่ยนตามพื้นที่</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                  aria-label="ปิด"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="no-scrollbar flex flex-col gap-2 overflow-y-auto">
                {areas.map((a) => {
                  const selected = a.id === area?.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setAreaId(a.id);
                        setOpen(false);
                      }}
                      className={clsx(
                        "flex items-center gap-3 rounded-2xl p-3 text-left ring-1",
                        selected ? "bg-emerald-50 ring-emerald-300" : "bg-white ring-slate-200"
                      )}
                    >
                      {a.logoUrl ? (
                        <img src={a.logoUrl} alt="" className="h-11 w-11 flex-none rounded-xl object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-emerald-600 text-white">
                          <MapPinned className="h-5 w-5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900">{a.displayName}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {a.name} · เหมาจ่าย {a.flatFare} บาท
                        </span>
                      </span>
                      {selected && <Check className="h-5 w-5 flex-none text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
