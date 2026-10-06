const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const { adminScope, requireSuper } = require("../middlewares/adminScope");
const ctrl = require("../controllers/admin.controller");

const router = Router();

// ทุก route ต้องเป็นแอดมิน และถูกจำกัดข้อมูลตามพื้นที่ที่ดูแล (ดู middlewares/adminScope.js)
router.use(requireAuth(["admin"]), adminScope);

router.get("/stats", ctrl.stats);
router.get("/users", ctrl.users);
router.get("/users/:id", ctrl.userDetail);
router.post("/users/:id/suspend", ctrl.suspendUser);
router.post("/users/:id/unsuspend", ctrl.unsuspendUser);
router.get("/drivers", ctrl.drivers);
router.get("/drivers/pending", ctrl.pendingDrivers);
router.get("/drivers/:id", ctrl.driverDetail);
router.post("/drivers/:id/suspend", ctrl.suspendDriver);
router.post("/drivers/:id/unsuspend", ctrl.unsuspendDriver);
router.post("/drivers/:id/approve", ctrl.approveDriver);
router.post("/drivers/:id/reject", ctrl.rejectDriver);
router.get("/trips", ctrl.trips);
router.post("/trips/:id/resolve-dispute", ctrl.resolveDispute);

router.get("/landmarks", ctrl.landmarks);
router.post("/landmarks", ctrl.createLandmark);
router.patch("/landmarks/:id", ctrl.updateLandmark);
router.delete("/landmarks/:id", ctrl.deleteLandmark);

router.get("/sos", ctrl.sosList);
router.post("/sos/:id/resolve", ctrl.resolveSos);

// พื้นที่: แอดมินพื้นที่ดู/แก้ค่าพื้นที่ตัวเองได้ (ค่าโดยสาร เบอร์ฉุกเฉิน ชื่อ ขอบเขต) สร้างใหม่ได้เฉพาะ super
router.get("/areas", ctrl.areas);
router.get("/areas/:id", ctrl.area);
router.post("/areas", requireSuper, ctrl.createArea);
router.patch("/areas/:id", ctrl.updateArea);

// บัญชีแอดมิน: super เท่านั้น
router.get("/admins", requireSuper, ctrl.admins);
router.post("/admins", requireSuper, ctrl.createAdmin);
router.patch("/admins/:id", requireSuper, ctrl.updateAdmin);
router.delete("/admins/:id", requireSuper, ctrl.deleteAdmin);

module.exports = router;
