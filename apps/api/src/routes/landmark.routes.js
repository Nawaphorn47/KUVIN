const { Router } = require("express");
const ctrl = require("../controllers/landmark.controller");

const router = Router();

router.get("/", ctrl.list);

module.exports = router;
