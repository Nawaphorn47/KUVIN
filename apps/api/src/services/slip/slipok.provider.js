// ตัวเชื่อม SlipOK (https://slipok.com/api-documentation/check-slip/)
//
// ข้อควรระวัง: เขียนตามเอกสารสาธารณะเท่าที่อ่านได้ ยังไม่เคยทดสอบกับ API key จริง — ก่อนเปิดใช้งานจริงให้ลองส่งสลิปจริง
// (สลิปถูก/ยอดผิด/สลิปเก่า/ไม่ใช่สลิป) แล้วตรวจว่า normalize() อ่านค่าได้ครบ โดยเฉพาะข้อมูลผู้รับ (receiver) เพราะ
// รูปแบบการปิดบังเลขต่างกันตามธนาคาร ถ้าอ่านผู้รับไม่ได้ ระบบจะไม่ยืนยันอัตโนมัติ (ตกไปให้คนขับยืนยันเอง) ไม่ใช่ผ่านมั่ว ๆ
//
// เจตนา: ไม่ส่ง `log: true` และ `amount` — log ทำให้ SlipOK เทียบผู้รับกับ "บัญชีเดียว" ที่ตั้งไว้ใน LINE LIFF
// (ระบบนี้ผู้รับคือคนขับแต่ละคน) และไม่ส่ง amount เพราะเราเทียบยอดเองเพื่อบอกผู้โดยสารได้ว่ายอดในสลิปเท่าไหร่
// การกันสลิปซ้ำทำเองที่ฐานข้อมูล (service_requests.paymentRef เป็น unique)

const { SlipError } = require("./errors");

const TIMEOUT_MS = 15 * 1000;

// รหัส error ของ SlipOK ตามเอกสาร (ตรวจกับเอกสารจริงก่อนใช้งาน) — รหัสที่ไม่รู้จักใช้ข้อความจาก provider ตรง ๆ
const NOT_A_SLIP = new Set([1006, 1007, 1008, 1011]);
const SLIP_TOO_FRESH = 1010;
const BANK_MAINTENANCE = 1009;

// รวมค่าที่เป็นข้อความ/ตัวเลขทั้งหมดใน object (proxy/account ของผู้รับ) ไว้เทียบเลขบัญชี/เบอร์
function collectStrings(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string" || typeof value === "number") out.push(String(value));
  else if (typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

function parseSentAt(d) {
  if (d.transTimestamp) {
    const t = new Date(d.transTimestamp);
    if (!Number.isNaN(t.getTime())) return t;
  }
  // transDate "YYYYMMDD" + transTime "HH:mm:ss" เวลาไทย (UTC+7)
  const date = String(d.transDate ?? "");
  const time = String(d.transTime ?? "");
  if (/^\d{8}$/.test(date) && /^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.length === 5 ? `${time}:00` : time}+07:00`;
    const t = new Date(iso);
    if (!Number.isNaN(t.getTime())) return t;
  }
  return null;
}

function normalize(body) {
  const d = body.data ?? body;
  const amount = Number(d.amount);
  const sentAt = parseSentAt(d);
  if (!d.transRef || !Number.isFinite(amount) || !sentAt) {
    throw new SlipError("SLIP_UNREADABLE", "อ่านข้อมูลจากสลิปไม่ครบ กรุณาถ่ายสลิปให้ชัดเจนแล้วลองใหม่");
  }
  return {
    ref: String(d.transRef),
    bank: d.sendingBank ? String(d.sendingBank) : null,
    amount,
    sentAt,
    receiverHints: collectStrings([d.receiver?.proxy, d.receiver?.account]),
  };
}

function createProvider({ apiKey, branchId, fetchImpl = fetch }) {
  if (!apiKey || !branchId) throw new Error("SLIP_PROVIDER=slipok ต้องตั้ง SLIPOK_API_KEY และ SLIPOK_BRANCH_ID");
  const url = `https://api.slipok.com/api/line/apikey/${branchId}`;

  return {
    name: "slipok",
    async verify({ buffer, mimeType, filename }) {
      const form = new FormData();
      form.append("files", new Blob([buffer], { type: mimeType }), filename || "slip");

      let res;
      let body;
      try {
        res = await fetchImpl(url, {
          method: "POST",
          headers: { "x-authorization": apiKey },
          body: form,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        body = await res.json().catch(() => ({}));
      } catch (err) {
        console.error("slipok request failed:", err.message);
        throw new SlipError("PROVIDER_UNAVAILABLE", "ระบบตรวจสลิปไม่พร้อมใช้งานชั่วคราว");
      }

      const d = body.data ?? body;
      if (res.ok && (body.success === true || d.success === true)) return normalize(body);

      const code = Number(body.code ?? d.code);
      const message = body.message ?? d.message;

      // ตั้งค่า key/สาขาผิด, โควตาหมด, เซิร์ฟเวอร์ของ provider ล่ม → ไม่ใช่ความผิดของผู้โดยสาร
      if (res.status === 401 || res.status === 403 || res.status >= 500) {
        console.error(`slipok error HTTP ${res.status} code ${code}: ${message}`);
        throw new SlipError("PROVIDER_UNAVAILABLE", "ระบบตรวจสลิปไม่พร้อมใช้งานชั่วคราว");
      }
      if (code === BANK_MAINTENANCE) {
        throw new SlipError("PROVIDER_UNAVAILABLE", "ธนาคารกำลังปรับปรุงระบบ ยังตรวจสลิปไม่ได้ในขณะนี้");
      }
      if (NOT_A_SLIP.has(code)) {
        throw new SlipError("NOT_A_SLIP", "ไม่พบ QR บนสลิป หรือรูปไม่ใช่สลิปโอนเงิน กรุณาแนบสลิปที่ชัดเจน");
      }
      if (code === SLIP_TOO_FRESH) {
        throw new SlipError("SLIP_NOT_READY", "สลิปเพิ่งโอนเสร็จ ธนาคารยังไม่พร้อมให้ตรวจ กรุณารอสักครู่แล้วลองอีกครั้ง");
      }
      throw new SlipError("SLIP_REJECTED", message || "ตรวจสอบสลิปไม่ผ่าน");
    },
  };
}

module.exports = { createProvider, normalize };
