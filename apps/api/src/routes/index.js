const { Router } = require("express");

const router = Router();

router.use("/auth", require("./auth.routes"));
router.use("/areas", require("./area.routes"));
router.use("/users", require("./user.routes"));
router.use("/landmarks", require("./landmark.routes"));
router.use("/routes", require("./route.routes"));
router.use("/drivers", require("./driver.routes"));
router.use("/service-requests", require("./serviceRequest.routes"));
router.use("/notifications", require("./notification.routes"));
router.use("/uploads", require("./upload.routes"));
router.use("/sos", require("./sos.routes"));
router.use("/admin", require("./admin.routes"));

// เปิดไฟล์ส่วนตัวด้วยลิงก์ที่เซ็นแล้ว (อายุสั้น) — ให้ <img> ของเจ้าของ/แอดมินเปิดได้โดยไม่ต้องแนบ header
// หน้าแชร์ทริปสาธารณะ (ไม่ต้องล็อกอิน) — ลิงก์อายุสั้น จำกัดความถี่กันสุ่มยิง
router.get("/public/trip-share/:token", require("../middlewares/rateLimit").publicLimiter, require("../controllers/publicTrip.controller").view);
router.get("/private-files/:token", require("../controllers/privateFile.controller").serve);
router.get("/health", (req, res) => res.json({ status: "ok" }));

module.exports = router;
