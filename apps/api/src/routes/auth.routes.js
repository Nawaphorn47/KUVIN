const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const { authLimiter } = require("../middlewares/rateLimit");
const ctrl = require("../controllers/auth.controller");

const router = Router();

// จำกัดเฉพาะ endpoint ที่เดารหัส/สุ่มอีเมลได้ — ไม่ครอบ /me เพราะต้องมี JWT ที่ถูกต้องอยู่แล้ว
router.post("/user/register", authLimiter, ctrl.registerUser);
router.post("/user/login", authLimiter, ctrl.loginUser);
router.post("/user/forgot-password", authLimiter, ctrl.forgotPassword);
router.post("/user/reset-password", authLimiter, ctrl.resetPassword);
router.post("/driver/register", authLimiter, ctrl.registerDriver);
router.post("/driver/login", authLimiter, ctrl.loginDriver);
router.post("/admin/login", authLimiter, ctrl.loginAdmin);
router.get("/me", requireAuth(), ctrl.me);

module.exports = router;
