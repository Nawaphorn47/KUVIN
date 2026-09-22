// ตัวจำลองการตรวจสลิปสำหรับ dev/ทดสอบ — ไม่ได้ตรวจอะไรจริง (รับรูปอะไรก็ได้) จึงห้ามใช้ใน production
// (slip/index.js ปฏิเสธการเริ่มระบบถ้า NODE_ENV=production แล้วตั้ง SLIP_PROVIDER=mock)
//
// ควบคุมผลลัพธ์ด้วยชื่อไฟล์ที่อัปโหลด:
//   wrong-amount*  ยอดเงินในสลิปไม่ตรง        wrong-receiver*  โอนให้คนอื่น
//   unknown-receiver*  สลิปไม่มีเลขผู้รับ       old-slip*  สลิปเก่าก่อนเริ่มทริป
//   not-slip*  ไม่ใช่สลิป                      provider-down*  ระบบตรวจสลิปล่ม
//   ref-<ชื่อ>*  ระบุเลขอ้างอิงเอง (ทดสอบสลิปซ้ำ) — ไม่ตรงกับอะไรเลย = สลิปถูกต้อง เลขอ้างอิงสุ่ม
const crypto = require("crypto");
const { SlipError } = require("./errors");

module.exports = {
  name: "mock",
  async verify({ filename = "" }, expected) {
    const f = filename.toLowerCase();

    if (f.startsWith("provider-down")) throw new SlipError("PROVIDER_UNAVAILABLE", "ระบบตรวจสลิปไม่พร้อมใช้งานชั่วคราว");
    if (f.startsWith("not-slip")) throw new SlipError("NOT_A_SLIP", "ไม่พบ QR บนสลิป หรือรูปไม่ใช่สลิปโอนเงิน กรุณาแนบสลิปที่ชัดเจน");

    const ref = f.match(/^ref-([a-z0-9]+)/)?.[1] ?? crypto.randomUUID().replace(/-/g, "").slice(0, 18);
    const last4 = String(expected.promptPayId).slice(-4);

    let receiverHints = [`xxx-xxx-${last4}`];
    if (f.startsWith("wrong-receiver")) receiverHints = ["xxx-xxx-0000"];
    if (f.startsWith("unknown-receiver")) receiverHints = [];

    return {
      ref,
      bank: "mock",
      amount: f.startsWith("wrong-amount") ? expected.amount + 5 : expected.amount,
      sentAt: f.startsWith("old-slip") ? new Date(expected.notBefore.getTime() - 60 * 60 * 1000) : new Date(),
      receiverHints,
    };
  },
};
