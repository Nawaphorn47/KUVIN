const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const ctrl = require("../controllers/notification.controller");

const router = Router();

router.get("/", requireAuth(), ctrl.list);
router.post("/:id/read", requireAuth(), ctrl.markRead);

module.exports = router;
