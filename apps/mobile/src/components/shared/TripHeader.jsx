import { Siren } from "lucide-react";

/**
 * แผ่นป้ายหัวของหน้าทริป (สีแบรนด์พื้นที่) — สถานะสั้น ๆ ตัวเลขใหญ่หนึ่งตัว (เวลา/วินาที) และปุ่ม SOS ที่ตำแหน่งเดิมทุกหน้า
 *  - status : บรรทัดเล็กด้านบน เช่น "คนขับกำลังมารับ"
 *  - value / unit : ตัวเลขใหญ่ เช่น 4 / "นาที" (ไม่มีค่า = โชว์ fallback)
 *  - onSos : ไม่ส่ง = ไม่มีปุ่ม SOS (เช่น ตอนยังหาคนขับ)
 */
// fallback ข้อความสั้น (เช่น "กำลังเดินทาง") ใช้ตัวใหญ่ ข้อความยาว (เช่น คำอธิบายปัญหา GPS) ใช้ตัวเล็กลงไม่ให้กินพื้นที่หัวจอ
export default function TripHeader({ status, value, unit, fallback, onSos, children }) {
  return (
    <header className="flex-none bg-brand-600 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-sm font-semibold text-brand-100">{status}</p>
          {value != null ? (
            <p className="mt-1 flex items-baseline gap-2">
              <span className="tabular text-fare">{value}</span>
              {unit && <span className="text-lg font-bold">{unit}</span>}
            </p>
          ) : (
            <p className={fallback.length > 24 ? "mt-1 text-base font-semibold leading-snug" : "mt-1 text-2xl font-bold leading-tight"}>{fallback}</p>
          )}
        </div>
        {onSos && (
          <button
            type="button"
            onClick={onSos}
            className="flex h-11 flex-none items-center gap-1.5 rounded-lg bg-here px-3 text-sm font-bold shadow-sticker active:brightness-90"
          >
            <Siren className="h-4 w-4" /> SOS
          </button>
        )}
      </div>
      {children}
    </header>
  );
}
