const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const ctrl = require("../controllers/admin.controller");

const router = Router();

router.use(requireAuth(["admin"]));

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

module.exports = router;
