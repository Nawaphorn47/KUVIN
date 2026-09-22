// ตัวเชื่อม EasySlip — เขียนตามเอกสาร POST /verify/bank (ตรวจสอบสลิปธนาคารด้วยรูปภาพ) ที่ผู้ใช้คัดลอกมาให้จาก
// document.easyslip.com เมื่อ 22 ก.ย. 2569 ยังไม่เคยทดสอบกับ API key จริง — ก่อนเปิดใช้งานจริงให้ลองส่งสลิปจริงหลายแบบ
// (ถูก/ยอดผิด/สลิปเก่า/ไม่ใช่สลิป) แล้วตรวจว่า normalize() อ่านค่าได้ครบ โดยเฉพาะข้อมูลผู้รับ (receiver) เพราะรูปแบบ
// การปิดบังเลขต่างกันตามธนาคาร ถ้าอ่านผู้รับไม่ได้ ระบบจะไม่ยืนยันอัตโนมัติ (ตกไปให้คนขับยืนยันเอง) ไม่ใช่ผ่านมั่ว ๆ
//
// เจตนา: ไม่ส่ง `matchAccount` / `matchAmount` / `checkDuplicate`
//  - `matchAccount` เทียบผู้รับกับ "บัญชีที่ลงทะเบียน" ไว้บัญชีเดียวกับ API key — ระบบนี้ผู้รับคือคนขับหลายคนคนละบัญชี
//    (เหตุผลเดียวกับที่ข้าม `log: true` ของ SlipOK) เราเทียบผู้รับเองใน services/slip/receiver.js แทน
//  - `matchAmount` ให้ EasySlip เทียบยอดเอง — เราเทียบเองในชั้น payment.service เพื่อคุมข้อความที่บอกผู้โดยสาร
//    (บอกทั้งยอดที่โอนจริงกับยอดที่ควรจะเป็น)
//  - `checkDuplicate` ผูกกับสโคปที่เอกสารไม่ได้ระบุชัด (ทั้งบัญชี/ทั้งเวลา) ถ้าผู้โดยสารอัปสลิปเดิมซ้ำเพื่อ retry
//    ทริปเดิมที่ยังไม่ผ่าน (เช่นครั้งแรก timeout) อาจถูกปฏิเสธผิด ๆ ทั้งที่ควรผ่าน — กันสลิปซ้ำข้ามทริปทำเองแล้ว
//    ที่ฐานข้อมูล (service_requests.paymentRef เป็น unique)

const { SlipError } = require("./errors");

const TIMEOUT_MS = 15 * 1000;
const URL = "https://api.easyslip.com/v2/verify/bank";

// error code ที่หมายถึง "รูป/สลิปมีปัญหา" — ส่งกลับให้ผู้โดยสารแก้ไขแล้วลองใหม่ได้
const IMAGE_ISSUE_MESSAGE = {
  SLIP_NOT_FOUND: "ไม่พบ QR บนสลิป หรือรูปไม่ใช่สลิปโอนเงิน กรุณาแนบสลิปที่ชัดเจน",
  INVALID_IMAGE_FORMAT: "ไฟล์รูปไม่ถูกต้องหรือเสียหาย กรุณาแนบรูปสลิปใหม่",
  INVALID_IMAGE_TYPE: "ไฟล์รูปไม่ถูกต้องหรือเสียหาย กรุณาแนบรูปสลิปใหม่",
  IMAGE_SIZE_TOO_LARGE: "ไฟล์รูปมีขนาดใหญ่เกินไป กรุณาลดขนาดรูปแล้วลองใหม่",
};
// ธนาคารกรุงเทพ: สลิปที่โอนมาไม่เกิน ~5 นาทียังตรวจไม่ได้ ต้องรอแล้วลองใหม่ (ไม่ใช่ปัญหาของสลิป)
const SLIP_PENDING = "SLIP_PENDING";

// รวมค่าที่เป็นข้อความ/ตัวเลขทั้งหมดใน object (bank/proxy ของผู้รับ) ไว้เทียบเลขบัญชี/เบอร์
function collectStrings(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string" || typeof value === "number") out.push(String(value));
  else if (typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

function normalize(body) {
  const slip = body.data?.rawSlip;
  const amount = Number(slip?.amount?.amount);
  const sentAt = slip?.date ? new Date(slip.date) : null; // ISO 8601 พร้อม offset เช่น "...+07:00" แปลงตรงได้เลย
  if (!slip?.transRef || !Number.isFinite(amount) || !sentAt || Number.isNaN(sentAt.getTime())) {
    throw new SlipError("SLIP_UNREADABLE", "อ่านข้อมูลจากสลิปไม่ครบ กรุณาถ่ายสลิปให้ชัดเจนแล้วลองใหม่");
  }
  return {
    ref: String(slip.transRef),
    bank: slip.sender?.bank?.short ?? slip.sender?.bank?.id ?? null,
    amount,
    sentAt,
    // account = เลขบัญชีธนาคาร (masked), proxy = พร้อมเพย์ (เบอร์/เลขบัตร ปชช., masked) ของผู้รับ
    receiverHints: collectStrings([slip.receiver?.account?.bank, slip.receiver?.account?.proxy]),
  };
}

function createProvider({ apiKey, fetchImpl = fetch }) {
  if (!apiKey) throw new Error("SLIP_PROVIDER=easyslip ต้องตั้ง EASYSLIP_API_KEY");

  return {
    name: "easyslip",
    async verify({ buffer, mimeType, filename }) {
      const form = new FormData();
      form.append("image", new Blob([buffer], { type: mimeType }), filename || "slip");

      let res;
      let body;
      try {
        res = await fetchImpl(URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        body = await res.json().catch(() => ({}));
      } catch (err) {
        console.error("easyslip request failed:", err.message);
        throw new SlipError("PROVIDER_UNAVAILABLE", "ระบบตรวจสลิปไม่พร้อมใช้งานชั่วคราว");
      }

      if (res.ok && body.success === true) return normalize(body);

      const code = body.error?.code ?? body.code ?? "UNKNOWN";
      const message = body.error?.message ?? body.message;

      // key ผิด (401), ไม่มีสิทธิ์/โควตาหมด/ถูกระงับ (403), ยิงถี่เกิน (429), เซิร์ฟเวอร์ล่ม (5xx)
      // → ไม่ใช่ความผิดของผู้โดยสาร ไม่นับเป็นความพยายาม
      if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) {
        console.error(`easyslip error HTTP ${res.status} code ${code}: ${message}`);
        throw new SlipError("PROVIDER_UNAVAILABLE", "ระบบตรวจสลิปไม่พร้อมใช้งานชั่วคราว");
      }
      if (code === SLIP_PENDING) {
        throw new SlipError("SLIP_NOT_READY", "สลิปเพิ่งโอนเสร็จ ธนาคารยังไม่พร้อมให้ตรวจ กรุณารอสักครู่แล้วลองอีกครั้ง");
      }
      if (code in IMAGE_ISSUE_MESSAGE) {
        throw new SlipError("NOT_A_SLIP", IMAGE_ISSUE_MESSAGE[code]);
      }
      // โค้ด 400 อื่น (VALIDATION_ERROR, INVALID_BANK_CODE, URL_*, ...) ไม่ควรเกิดเพราะเราส่งแค่ฟิลด์ image
      // ถ้าเจอแปลว่าคำขอที่เราสร้างเองผิดรูปแบบ ไม่ใช่ของผู้โดยสาร
      if (res.status === 400) {
        console.error(`easyslip request error code ${code}: ${message} — ตรวจสอบรูปแบบคำขอ`);
        throw new SlipError("PROVIDER_UNAVAILABLE", "ระบบตรวจสลิปไม่พร้อมใช้งานชั่วคราว");
      }
      throw new SlipError("SLIP_REJECTED", message || "ตรวจสอบสลิปไม่ผ่าน");
    },
  };
}

module.exports = { createProvider, normalize };
