const express = require("express");
const {
  createReading,
  listReadings
} = require("../controllers/reading.controller");
const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, listReadings);
router.post("/", optionalAuth, createReading);

module.exports = router;
