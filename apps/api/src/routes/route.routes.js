const { Router } = require("express");
const requireAuth = require("../middlewares/auth");
const ctrl = require("../controllers/route.controller");

const router = Router();

router.get("/", requireAuth(["user", "driver"]), ctrl.get);

module.exports = router;
