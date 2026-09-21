const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const ctrl = require("../controllers/sos.controller");

const router = Router();

// { lat?, lng?, note?, serviceRequestId?, contactedEmergencyNumber? } — admin เห็นทันทีผ่าน socket event
// "sos:new" (room "admin")
router.post("/", requireAuth(["user", "driver"]), ctrl.create);

// { contactedEmergencyNumber: "1669" | "191" } — บันทึกภายหลังว่าผู้แจ้งกดโทรหน่วยงานภายนอกแล้ว
router.post("/:id/contacted", requireAuth(["user", "driver"]), ctrl.markContacted);

// ผู้แจ้งยกเลิกเอง (กดผิด/แจ้งเหตุพลาด) — ใช้ได้เฉพาะเจ้าของ alert และต้องยังไม่ถูก admin ปิดเคสไปก่อน
router.post("/:id/cancel", requireAuth(["user", "driver"]), ctrl.cancel);

module.exports = router;
