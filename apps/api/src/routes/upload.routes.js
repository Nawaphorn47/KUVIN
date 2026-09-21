const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const ctrl = require("../controllers/upload.controller");

const router = Router();

// อัปโหลดรูปภาพทั่วไป (เช่น เอกสารยืนยันตัวตนคนขับ) — ได้ url กลับมาแล้วค่อยส่งต่อไปที่ endpoint อื่น
// เช่น POST /drivers/me/verify { photoUrl, idCardPhotoUrl, ... }
router.post("/", requireAuth(), upload.single("file"), ctrl.uploadFile);

module.exports = router;
