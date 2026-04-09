const express = require("express");
const {
  createReading,
  listReadings
} = require("../controllers/reading.controller");

const router = express.Router();

router.get("/", listReadings);
router.post("/", createReading);

module.exports = router;
