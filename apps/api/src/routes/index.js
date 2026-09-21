const { Router } = require("express");

const router = Router();

router.use("/auth", require("./auth.routes"));
router.use("/users", require("./user.routes"));
router.use("/landmarks", require("./landmark.routes"));
router.use("/routes", require("./route.routes"));
router.use("/drivers", require("./driver.routes"));
router.use("/service-requests", require("./serviceRequest.routes"));
router.use("/notifications", require("./notification.routes"));
router.use("/uploads", require("./upload.routes"));
router.use("/sos", require("./sos.routes"));
router.use("/admin", require("./admin.routes"));

router.get("/health", (req, res) => res.json({ status: "ok" }));

module.exports = router;
