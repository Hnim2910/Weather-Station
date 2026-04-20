const express = require("express");
const {
  listDevices,
  claimDevice,
  updateDeviceProfile,
  unclaimDevice,
  adminForceUnclaimDevice,
  getDistrictAnalytics,
  getDeviceAlerts,
  updateDeviceAlerts
} = require("../controllers/device.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/", listDevices);
router.post("/claim", claimDevice);
router.patch("/:deviceId", updateDeviceProfile);
router.get("/district-analytics", requireRole("admin"), getDistrictAnalytics);
router.get("/:deviceId/alerts", getDeviceAlerts);
router.patch("/:deviceId/alerts", updateDeviceAlerts);
router.post("/:deviceId/unclaim", unclaimDevice);
router.post("/:deviceId/force-unclaim", requireRole("admin"), adminForceUnclaimDevice);

module.exports = router;
