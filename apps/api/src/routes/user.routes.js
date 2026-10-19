const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const { authLimiter } = require("../middlewares/rateLimit");
const privateUpload = require("../middlewares/privateUpload");
const ctrl = require("../controllers/user.controller");
const identity = require("../controllers/identity.controller");
const { requireRealImage } = require("../utils/imageCheck");

const router = Router();

router.patch("/me/fcm-token", requireAuth(["user"]), ctrl.updateFcmToken);
router.patch("/me", requireAuth(["user"]), ctrl.updateProfile);
router.post("/me/verify-phone", requireAuth(["user"]), authLimiter, identity.verifyMyPhone);
router.post("/me/selfie", requireAuth(["user"]), privateUpload.single("file"), requireRealImage, identity.uploadSelfie);

module.exports = router;
