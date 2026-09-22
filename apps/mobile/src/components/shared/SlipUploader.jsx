import { useRef, useState } from "react";
import { Loader2, ReceiptText, AlertTriangle } from "lucide-react";
import Button from "../ui/Button";
import { api } from "../../lib/api";

// รหัสที่หมายความว่า "ส่งสลิปใหม่ก็ไม่ช่วย" — ให้บอกผู้โดยสารไปทางคนขับแทนการวนลองซ้ำ
const GIVE_UP_CODES = new Set(["SLIP_ATTEMPTS_EXCEEDED", "RECEIVER_UNVERIFIABLE", "NO_PROMPTPAY", "SLIP_DISABLED"]);

// ผู้โดยสารโอนตาม QR แล้วแนบสลิปที่นี่ — server ตรวจกับธนาคารและเปลี่ยนสถานะเป็นจ่ายแล้วให้อัตโนมัติ
export default function SlipUploader({ requestId, onPaid }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [giveUp, setGiveUp] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้อีกครั้งหลังแก้ปัญหา
    if (!file) return;

    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post(`/service-requests/${requestId}/payment-slip`, form);
      onPaid?.(data.request);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || "ตรวจสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setGiveUp(GIVE_UP_CODES.has(data?.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
        {busy ? "กำลังตรวจสลิป..." : "โอนแล้ว แนบสลิปเพื่อยืนยัน"}
      </Button>
      {error && (
        <p className="flex items-start gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-left text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          <span>
            {error}
            {giveUp && " หรือแจ้งคนขับให้กดยืนยันว่าได้รับเงินแล้ว"}
          </span>
        </p>
      )}
    </div>
  );
}
