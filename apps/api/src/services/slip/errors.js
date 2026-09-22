// ข้อผิดพลาดจากการตรวจสลิป — code ใช้ให้ payment.service แยกว่า "สลิปมีปัญหา" (นับเป็นความพยายามของผู้โดยสาร)
// หรือ "บริการตรวจสลิปล่ม" (ไม่นับ และให้คนขับยืนยันเองแทน)
class SlipError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// รหัสที่ถือว่าเป็นความผิดพลาดของบริการ/การตั้งค่า ไม่ใช่ของผู้โดยสาร
const PROVIDER_FAILURE_CODES = new Set(["PROVIDER_UNAVAILABLE"]);

module.exports = { SlipError, PROVIDER_FAILURE_CODES };
