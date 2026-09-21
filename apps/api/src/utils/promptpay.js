// สร้าง QR พร้อมเพย์สำหรับรับชำระค่าโดยสาร — ใช้ไลบรารีที่ทีมนักพัฒนาไทยใช้กันแพร่หลาย (promptpay-qr) แทนที่จะ
// เขียน EMV payload + checksum เองจากความจำ เพราะเป็นเรื่องเงินจริง เขียนผิดนิดเดียวอาจได้ QR ที่สแกนไม่ได้
// หรือยอดเงินผิดได้ — ทดสอบแล้วว่าได้ payload ที่ถูกต้องตรงตามสเปกจริง
const generatePayload = require("promptpay-qr");
const QRCode = require("qrcode");

// เบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก เท่านั้นที่ผูกพร้อมเพย์ได้จริง
function isValidPromptPayId(id) {
  return /^\d{10}$/.test(id) || /^\d{13}$/.test(id);
}

async function generatePaymentQr(promptPayId, amount) {
  const payload = generatePayload(promptPayId, { amount });
  const qrDataUrl = await QRCode.toDataURL(payload, { width: 320, margin: 1 });
  return { payload, qrDataUrl };
}

module.exports = { isValidPromptPayId, generatePaymentQr };
