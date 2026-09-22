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
      <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <Banknote className="h-5 w-5 flex-none text-slate-400" /> {error}
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl bg-slate-50">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-100">
      <p className="text-xs font-semibold text-slate-500">สแกนจ่ายด้วยพร้อมเพย์</p>
      <img src={qr.qrDataUrl} alt="พร้อมเพย์ QR" className="h-48 w-48" />
      <p className="text-2xl font-bold text-emerald-600">{qr.amount} ฿</p>
    </div>
  );
}
