import { useEffect, useState } from "react";
import { Loader2, Banknote } from "lucide-react";
import { api } from "../../lib/api";

// QR พร้อมเพย์ให้สแกนจ่ายค่าโดยสารตรงให้คนขับ — ถ้าคนขับยังไม่ได้ตั้งค่าพร้อมเพย์ไว้ (promptPayId) จะโชว์ข้อความ
// ให้จ่ายเงินสดแทนแทนที่จะพัง เพราะพร้อมเพย์เป็นออปชันเสริม ไม่ใช่วิธีชำระเงินบังคับ
export default function PaymentQr({ requestId, onLoaded }) {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/service-requests/${requestId}/payment-qr`)
      .then(({ data }) => {
        setQr(data);
        onLoaded?.(data); // เช่น slipVerification = เปิดตรวจสลิปอัตโนมัติอยู่หรือไม่
      })
      .catch((err) => setError(err.response?.data?.message || "โหลด QR ไม่สำเร็จ"));
    // onLoaded เปลี่ยนตัวทุก render ไม่ควรทำให้ยิง API ซ้ำ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
        <Banknote className="h-5 w-5 flex-none text-slate-500" /> {error}
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-label="กำลังโหลด QR" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-600">สแกนจ่ายด้วยพร้อมเพย์</p>
      <img src={qr.qrDataUrl} alt={`QR พร้อมเพย์ ยอด ${qr.amount} บาท`} className="h-52 w-52" />
      <p className="tabular text-2xl font-bold text-slate-900">{qr.amount} ฿</p>
    </div>
  );
}
