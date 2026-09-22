// ตรวจสลิปโอนเงินพร้อมเพย์ของผู้โดยสาร แล้วเปลี่ยนสถานะทริปเป็น "จ่ายแล้ว" ให้อัตโนมัติ
//
// ยืนยันอัตโนมัติก็ต่อเมื่อผ่านครบทุกข้อ: (1) ผู้ให้บริการยืนยันว่าเป็นสลิปจริง (2) ยอดตรงค่าโดยสาร (3) ผู้รับตรงกับ
// พร้อมเพย์ของคนขับทริปนี้ (4) เวลาโอนอยู่หลังเริ่มทริป (กันเอาสลิปเก่ามาใช้) (5) เลขอ้างอิงธุรกรรมยังไม่เคยถูกใช้กับ
// ทริปอื่น (unique ที่ DB) — ข้อไหนไม่ผ่านจะไม่ยืนยัน และผู้โดยสารส่งสลิปใหม่ได้ (จำกัดจำนวนครั้ง) ส่วนคนขับยังกดยืนยัน
// เองได้เสมอเป็นทางสำรอง
//
// ไม่เก็บรูปสลิป: สลิปมีข้อมูลบัญชีของผู้โอน ส่งต่อให้ผู้ให้บริการตรวจแล้วทิ้ง เก็บแค่เลขอ้างอิงธุรกรรม

const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const slip = require("./slip");
const { SlipError, PROVIDER_FAILURE_CODES } = require("./slip/errors");
const { matchReceiver } = require("./slip/receiver");
const { notify } = require("./notification.service");

const MAX_ATTEMPTS = Number(process.env.SLIP_MAX_ATTEMPTS) || 5;
const CLOCK_SKEW_MS = 5 * 60 * 1000; // เผื่อนาฬิกาธนาคาร/เซิร์ฟเวอร์เหลื่อมกัน
const AMOUNT_TOLERANCE = 0.005;

const baht = (n) => Number(n).toFixed(2).replace(/\.00$/, "");

// ตรวจข้อมูลจากสลิปเทียบกับทริป (ฟังก์ชันล้วน ทดสอบตรง ๆ ได้) — คืน { ok: true } หรือ { ok: false, code, message }
function evaluateSlip(data, { fare, promptPayId, notBefore, now = new Date() }) {
  if (Math.abs(data.amount - fare) > AMOUNT_TOLERANCE) {
    return {
      ok: false,
      code: "AMOUNT_MISMATCH",
      message: `ยอดในสลิป ${baht(data.amount)} บาท ไม่ตรงกับค่าโดยสาร ${baht(fare)} บาท`,
    };
  }

  const receiver = matchReceiver(promptPayId, data.receiverHints);
  if (receiver === "MISMATCH") {
    return { ok: false, code: "RECEIVER_MISMATCH", message: "สลิปนี้โอนให้บัญชีอื่น ไม่ใช่พร้อมเพย์ของคนขับทริปนี้" };
  }
  if (receiver === "UNKNOWN") {
    return {
      ok: false,
      code: "RECEIVER_UNVERIFIABLE",
      message: "ตรวจไม่ได้ว่าสลิปโอนให้คนขับคนนี้หรือไม่ กรุณาให้คนขับกดยืนยันการรับเงินแทน",
    };
  }

  if (data.sentAt.getTime() < notBefore.getTime() - CLOCK_SKEW_MS) {
    return { ok: false, code: "SLIP_TOO_OLD", message: "สลิปนี้โอนก่อนเริ่มทริป ไม่สามารถใช้ชำระค่าโดยสารทริปนี้ได้" };
  }
  if (data.sentAt.getTime() > now.getTime() + CLOCK_SKEW_MS) {
    return { ok: false, code: "SLIP_IN_FUTURE", message: "เวลาบนสลิปไม่ถูกต้อง" };
  }

  return { ok: true };
}

async function submitSlip(requestId, userId, file, io) {
  if (!slip.isEnabled()) {
    throw ApiError.conflict("ระบบตรวจสลิปอัตโนมัติยังไม่เปิดใช้งาน กรุณาให้คนขับกดยืนยันการรับเงิน", "SLIP_DISABLED");
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: { driver: { select: { id: true, fullName: true, promptPayId: true } } },
  });
  if (!request) throw ApiError.notFound("ไม่พบคำขอนี้");
  if (request.userId !== userId) throw ApiError.forbidden("ไม่มีสิทธิ์ชำระเงินทริปนี้");
  if (request.status !== "COMPLETED") throw ApiError.conflict("ชำระเงินได้หลังทริปเสร็จสิ้นเท่านั้น");
  if (request.paymentStatus === "PAID") throw ApiError.conflict("ทริปนี้ชำระเงินเรียบร้อยแล้ว");
  if (!request.driver?.promptPayId) {
    throw ApiError.conflict("คนขับยังไม่ได้ตั้งค่าพร้อมเพย์ กรุณาชำระเงินสดแทน", "NO_PROMPTPAY");
  }
  if (!request.fare) throw ApiError.conflict("ทริปนี้ยังไม่มีค่าโดยสารให้ชำระ");
  if (request.paymentSlipAttempts >= MAX_ATTEMPTS) {
    throw ApiError.conflict("ส่งสลิปเกินจำนวนครั้งที่กำหนด กรุณาให้คนขับกดยืนยันการรับเงินแทน", "SLIP_ATTEMPTS_EXCEEDED");
  }

  const notBefore = request.acceptedAt ?? request.requestedAt;

  // 1) ให้ผู้ให้บริการตรวจว่าเป็นสลิปจริง
  let data;
  try {
    data = await slip.verify(
      { buffer: file.buffer, mimeType: file.mimetype, filename: file.originalname },
      { amount: request.fare, promptPayId: request.driver.promptPayId, notBefore }
    );
  } catch (err) {
    if (!(err instanceof SlipError)) throw err;
    if (PROVIDER_FAILURE_CODES.has(err.code)) {
      throw ApiError.unprocessable(`${err.message} กรุณาลองใหม่ภายหลัง หรือให้คนขับกดยืนยันการรับเงินแทน`, err.code);
    }
    return rejectSlip(request, err.code, err.message);
  }

  // 2) เทียบกับทริปนี้
  const verdict = evaluateSlip(data, { fare: request.fare, promptPayId: request.driver.promptPayId, notBefore });
  if (!verdict.ok) return rejectSlip(request, verdict.code, verdict.message);

  // 3) บันทึกว่าจ่ายแล้ว — เงื่อนไขสถานะ + unique ของเลขอ้างอิงกันสลิปซ้ำและการส่งซ้ำพร้อมกัน
  const paymentRef = data.bank ? `${data.bank}:${data.ref}` : data.ref;
  let updated;
  try {
    const result = await prisma.serviceRequest.updateMany({
      where: { id: requestId, paymentStatus: { in: ["PENDING", "DISPUTED"] } },
      data: {
        paymentStatus: "PAID",
        paymentMethod: "PROMPTPAY",
        paymentRef,
        paymentVerifiedAt: new Date(),
        paymentConfirmedBy: "SLIP",
        paymentSlipError: null,
        disputeNote: null,
      },
    });
    if (result.count === 0) throw ApiError.conflict("ทริปนี้ชำระเงินเรียบร้อยแล้ว");
  } catch (err) {
    if (err?.code === "P2002") {
      return rejectSlip(request, "SLIP_ALREADY_USED", "สลิปนี้เคยถูกใช้ชำระค่าโดยสารไปแล้ว");
    }
    throw err;
  }

  updated = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { id: true, fullName: true, phone: true } },
      driver: { select: { id: true, fullName: true, phone: true, vinNumber: true, vehicleModel: true, licensePlate: true } },
    },
  });

  io?.to(`service-request:${requestId}`).emit("service-request:status", updated);
  await notify(io, {
    recipientType: "DRIVER",
    recipientId: request.driver.id,
    title: "ได้รับชำระเงินแล้ว",
    body: `ผู้โดยสารโอนค่าโดยสาร ${baht(request.fare)} บาท และตรวจสลิปเรียบร้อยแล้ว`,
  });

  return { verified: true, request: updated };
}

// สลิปมีปัญหา: นับเป็นความพยายาม 1 ครั้ง เก็บเหตุผลไว้ให้ admin ดู แล้วบอกผู้โดยสาร (HTTP 422)
async function rejectSlip(request, code, message) {
  const updated = await prisma.serviceRequest.update({
    where: { id: request.id },
    data: { paymentSlipAttempts: { increment: 1 }, paymentSlipError: `${code}: ${message}` },
    select: { paymentSlipAttempts: true },
  });
  const left = Math.max(0, MAX_ATTEMPTS - updated.paymentSlipAttempts);
  const suffix = left > 0 ? ` (ลองได้อีก ${left} ครั้ง)` : " (ครบจำนวนครั้งแล้ว กรุณาให้คนขับกดยืนยันการรับเงินแทน)";
  throw ApiError.unprocessable(`${message}${suffix}`, code);
}

module.exports = { submitSlip, evaluateSlip, MAX_ATTEMPTS };
