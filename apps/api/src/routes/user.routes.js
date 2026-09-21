const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const ctrl = require("../controllers/user.controller");

const router = Router();

router.patch("/me/fcm-token", requireAuth(["user"]), ctrl.updateFcmToken);
router.patch("/me", requireAuth(["user"]), ctrl.updateProfile);

module.exports = router;
