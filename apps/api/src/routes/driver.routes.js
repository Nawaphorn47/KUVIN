const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const ctrl = require("../controllers/driver.controller");

const router = Router();

router.get("/me", requireAuth(["driver"]), ctrl.me);
router.patch("/me/location", requireAuth(["driver"]), ctrl.updateLocation);
router.patch("/me/availability", requireAuth(["driver"]), ctrl.updateAvailability);
router.patch("/me/fcm-token", requireAuth(["driver"]), ctrl.updateFcmToken);
router.patch("/me", requireAuth(["driver"]), ctrl.updateProfile);
router.post("/me/verify", requireAuth(["driver"]), ctrl.submitVerification);
router.get("/:id", requireAuth(), ctrl.getById);

module.exports = router;
