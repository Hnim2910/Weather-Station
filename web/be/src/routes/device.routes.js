const express = require("express");
const {
  listDevices,
  claimDevice,
  unclaimDevice,
  adminForceUnclaimDevice,
  getDeviceAlerts,
  updateDeviceAlerts
} = require("../controllers/device.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/", listDevices);
router.post("/claim", claimDevice);
router.get("/:deviceId/alerts", getDeviceAlerts);
router.patch("/:deviceId/alerts", updateDeviceAlerts);
router.post("/:deviceId/unclaim", unclaimDevice);
router.post("/:deviceId/force-unclaim", requireRole("admin"), adminForceUnclaimDevice);

module.exports = router;
