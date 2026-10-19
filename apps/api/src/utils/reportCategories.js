// หมวดการแจ้งปัญหาหลังทริป แยกตามคนแจ้ง — แอปแสดงตามรายการนี้ (GET /auth/config) แอดมินใช้จัดลำดับความสำคัญ
const REPORT_CATEGORIES = {
  user: {
    DANGEROUS_DRIVING: "ขับรถอันตราย",
    HARASSMENT: "คุกคาม/พูดจาไม่เหมาะสม",
    OVERCHARGE: "เก็บเงินเกิน",
    WRONG_ROUTE: "พาอ้อม/ไปผิดทาง",
    NO_HELMET: "ไม่มีหมวกกันน็อกให้",
    LOST_ITEM: "ลืมของไว้ในรถ",
    NO_SHOW: "คนขับไม่มารับ",
    OTHER: "อื่น ๆ",
  },
  driver: {
    HARASSMENT: "คุกคาม/พูดจาไม่เหมาะสม",
    NO_PAY: "ไม่จ่ายค่าโดยสาร",
    DAMAGE: "ทำรถเสียหาย",
    UNSAFE_BEHAVIOR: "ทำตัวไม่ปลอดภัยระหว่างทาง",
    LOST_ITEM: "ผู้โดยสารลืมของ",
    NO_SHOW: "ผู้โดยสารไม่มาที่จุดรับ",
    OTHER: "อื่น ๆ",
  },
};

// หมวดที่แอดมินควรดูก่อน (เกี่ยวกับความปลอดภัยของคน)
const URGENT_CATEGORIES = new Set(["DANGEROUS_DRIVING", "HARASSMENT", "UNSAFE_BEHAVIOR"]);

module.exports = { REPORT_CATEGORIES, URGENT_CATEGORIES };
