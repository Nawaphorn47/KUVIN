// ตัวเชื่อม SlipOK — เขียนตาม "SlipOK API Guide" v1.13 (28 ก.พ. 2026) ที่ผู้ใช้ส่งมาให้ (PDF ทางการ ไม่ใช่เอกสารเว็บ
// สาธารณะที่เดาไว้ตอนแรก) ยังไม่เคยทดสอบกับ API key จริง — ก่อนเปิดใช้งานจริงให้ลองส่งสลิปจริง (สลิปถูก/ยอดผิด/
// สลิปเก่า/ไม่ใช่สลิป) แล้วตรวจว่า normalize() อ่านค่าได้ครบ โดยเฉพาะข้อมูลผู้รับ (receiver) เพราะรูปแบบการปิดบังเลข
// ต่างกันตามธนาคาร ถ้าอ่านผู้รับไม่ได้ ระบบจะไม่ยืนยันอัตโนมัติ (ตกไปให้คนขับยืนยันเอง) ไม่ใช่ผ่านมั่ว ๆ
//
// เจตนา: ไม่ส่ง `log: true` และ `amount`
//  - `log: true` เปิด 3 อย่างที่ไม่ตรงกับระบบนี้: (1) เก็บสถิติไว้ดูใน LINE LIFF dashboard (ไม่ได้ใช้ LIFF)
//    (2) เทียบผู้รับกับ "บัญชีเดียว" ที่ผูกไว้กับ branch (error 1014) — ระบบนี้ผู้รับคือคนขับหลายคนคนละบัญชี
//    (3) กันสลิปซ้ำฝั่ง SlipOK เอง (error 1012) — เราทำเองที่ฐานข้อมูลอยู่แล้ว (service_requests.paymentRef unique)
//    ผลคือ error 1012/1014 จะไม่มีทางเกิดขึ้นเพราะเราไม่ได้เปิดสองอย่างที่ทำให้เกิด error นั้น
//  - `amount` ถ้าส่งไปแล้วไม่ตรง SlipOK จะตอบ error 1013 พร้อมยังไงก็ตาม เราเทียบยอดเองในชั้น payment.service
//    เพื่อคุมข้อความที่บอกผู้โดยสารเอง (บอกทั้งยอดที่โอนจริงกับยอดที่ควรจะเป็น)

const { SlipError } = require("./errors");

const TIMEOUT_MS = 15 * 1000;

// รหัส error ตาม "Error Status Code" ในเอกสาร — กลุ่มที่เป็นปัญหาฝั่งเรา (ตั้งค่า/แพ็กเกจ/โควตา) ไม่ใช่ของผู้โดยสาร
// 1000 ไม่มี data/files/url ในคำขอ (ไม่ควรเกิดเพราะเราส่ง files เสมอ — ถ้าเกิดคือบั๊กโค้ดเรา)
// 1003 แพ็กเกจหมดอายุ, 1004 เกินโควตาแพ็กเกจ, 1015 ไม่มีแพ็กเกจ
const CONFIG_ERROR = new Set([1000, 1003, 1004, 1015]);
// รูปไม่ใช่สลิปที่อ่านได้: 1006 ไฟล์รูปเสีย/ผิดชนิด, 1007 ไม่พบ QR ในรูป, 1008 ไม่ใช่ QR ของสลิปโอนเงิน, 1011 QR หมดอายุ/ตรวจย้อนหลังไม่ได้แล้ว
const NOT_A_SLIP = new Set([1006, 1007, 1008, 1011]);
// 1010: ธนาคาร BBL/SCB บางครั้งต้องรอไม่กี่นาทีก่อนตรวจสลิปที่เพิ่งโอนได้ (data.delay = นาทีที่ต้องรอ)
const SLIP_TOO_FRESH = 1010;
// 1009: ธนาคารปิดปรับปรุงระบบชั่วคราว (ปกติ ~15 นาที)
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

      // ตั้งค่า key/สาขาผิด (401), ไม่มีสิทธิ์ (403), เซิร์ฟเวอร์ของ provider ล่ม (5xx) → ไม่ใช่ความผิดของผู้โดยสาร
      if (res.status === 401 || res.status === 403 || res.status >= 500) {
        console.error(`slipok error HTTP ${res.status} code ${code}: ${message}`);
        throw new SlipError("PROVIDER_UNAVAILABLE", "ระบบตรวจสลิปไม่พร้อมใช้งานชั่วคราว");
      }
      // แพ็กเกจ/โควตา/รูปแบบคำขอผิดฝั่งเรา → แจ้งชัดเจนใน log เพราะต้องมีคนไปแก้ที่บัญชี SlipOK ไม่ใช่รอผู้โดยสารลองใหม่
      if (CONFIG_ERROR.has(code)) {
        console.error(`slipok config/package error code ${code}: ${message} — ตรวจสอบแพ็กเกจ/โควตาในบัญชี SlipOK`);
        throw new SlipError("PROVIDER_UNAVAILABLE", "ระบบตรวจสลิปไม่พร้อมใช้งานชั่วคราว");
      }
      if (code === BANK_MAINTENANCE) {
        throw new SlipError("PROVIDER_UNAVAILABLE", "ธนาคารกำลังปรับปรุงระบบ ยังตรวจสลิปไม่ได้ในขณะนี้");
      }
      if (NOT_A_SLIP.has(code)) {
        throw new SlipError("NOT_A_SLIP", "ไม่พบ QR บนสลิป หรือรูปไม่ใช่สลิปโอนเงิน กรุณาแนบสลิปที่ชัดเจน");
      }
      if (code === SLIP_TOO_FRESH) {
        const delay = Number(d.delay ?? body.data?.delay);
        const wait = Number.isFinite(delay) && delay > 0 ? `${delay} นาที` : "สักครู่";
        throw new SlipError("SLIP_NOT_READY", `สลิปเพิ่งโอนเสร็จ ธนาคารยังไม่พร้อมให้ตรวจ กรุณารอ ${wait} แล้วลองอีกครั้ง`);
      }
      throw new SlipError("SLIP_REJECTED", message || "ตรวจสอบสลิปไม่ผ่าน");
    },
  };
}

module.exports = { createProvider, normalize };
