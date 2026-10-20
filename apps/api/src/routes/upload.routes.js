const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const ctrl = require("../controllers/upload.controller");
const { requireRealImage } = require("../utils/imageCheck");

const router = Router();

// อัปโหลดรูปที่เปิดดูได้สาธารณะ (เช่น โลโก้วิทยาเขต) — เฉพาะแอดมิน
// เอกสารส่วนตัว (บัตร/ใบขับขี่/เซลฟี่) ไม่ผ่านทางนี้แล้ว ใช้ POST /drivers/me/documents และ /users/me/selfie แทน
router.post("/", requireAuth(["admin"]), upload.single("file"), requireRealImage, ctrl.uploadFile);

module.exports = router;
