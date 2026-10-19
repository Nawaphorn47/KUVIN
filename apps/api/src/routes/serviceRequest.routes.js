const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const slipUpload = require("../middlewares/slipUpload");
const ctrl = require("../controllers/serviceRequest.controller");
const chat = require("../controllers/chat.controller");

const router = Router();

router.post("/estimate", requireAuth(["user"]), ctrl.estimate);
router.post("/", requireAuth(["user"]), ctrl.create);
router.get("/mine", requireAuth(["user"]), ctrl.mineAsUser);
router.get("/driver/mine", requireAuth(["driver"]), ctrl.mineAsDriver);
router.get("/pending", requireAuth(["driver"]), ctrl.pending);
router.get("/queue", requireAuth(["driver"]), ctrl.queue);

router.get("/:id", requireAuth(), ctrl.getById);
router.post("/:id/accept", requireAuth(["driver"]), ctrl.accept);
router.post("/:id/decline", requireAuth(["driver"]), ctrl.decline);
router.post("/:id/start", requireAuth(["driver"]), ctrl.start);
router.post("/:id/complete", requireAuth(["driver"]), ctrl.complete);
router.post("/:id/cancel", requireAuth(["user", "driver"]), ctrl.cancel);
router.post("/:id/payment", requireAuth(["driver"]), ctrl.setPayment);
router.post("/:id/payment-slip", requireAuth(["user"]), slipUpload.single("file"), ctrl.paymentSlip);
router.get("/:id/payment-qr", requireAuth(["user", "driver"]), ctrl.paymentQr);
router.post("/:id/rating", requireAuth(["user"]), ctrl.rate);
router.post("/:id/rate-passenger", requireAuth(["driver"]), ctrl.ratePassenger);

// แชตในทริประหว่างผู้โดยสารกับคนขับ (ดู services/chat.service.js)
router.get("/:id/messages", requireAuth(["user", "driver"]), chat.list);

// ความปลอดภัยระหว่างทริป: ลิงก์แชร์ทริป, แจ้งปัญหาหลังทริป
router.post("/:id/share", requireAuth(["user"]), ctrl.share);
router.post("/:id/report", requireAuth(["user", "driver"]), ctrl.report);
router.post("/:id/messages", requireAuth(["user", "driver"]), chat.send);

module.exports = router;
