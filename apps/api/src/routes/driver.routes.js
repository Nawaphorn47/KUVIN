const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const ctrl = require("../controllers/driver.controller");
const privateUpload = require("../middlewares/privateUpload");
const { requireRealImage } = require("../utils/imageCheck");

const router = Router();

router.get("/me", requireAuth(["driver"]), ctrl.me);
router.patch("/me/location", requireAuth(["driver"]), ctrl.updateLocation);
router.patch("/me/availability", requireAuth(["driver"]), ctrl.updateAvailability);
router.patch("/me/fcm-token", requireAuth(["driver"]), ctrl.updateFcmToken);
router.patch("/me", requireAuth(["driver"]), ctrl.updateProfile);
// เอกสารยืนยันตัวตน: อัปโหลดทีละใบเข้าโฟลเดอร์ส่วนตัว แล้วส่ง ref ทั้งชุดไปที่ /me/verify
router.post("/me/documents", requireAuth(["driver"]), privateUpload.single("file"), requireRealImage, ctrl.uploadDocument);
router.post("/me/verify", requireAuth(["driver"]), ctrl.submitVerification);

// การเงินของคนขับ: ตั้งค่ารถ (อัตราสิ้นเปลือง/ราคาน้ำมัน), จดรายจ่าย, สรุปรายรับ–รายจ่าย
router.get("/me/finance", requireAuth(["driver"]), ctrl.finance);
router.patch("/me/vehicle", requireAuth(["driver"]), ctrl.updateVehicle);
router.get("/me/expenses", requireAuth(["driver"]), ctrl.expenses);
router.post("/me/expenses", requireAuth(["driver"]), ctrl.createExpense);
router.patch("/me/expenses/:id", requireAuth(["driver"]), ctrl.updateExpense);
router.delete("/me/expenses/:id", requireAuth(["driver"]), ctrl.deleteExpense);

router.get("/:id", requireAuth(), ctrl.getById);

module.exports = router;
