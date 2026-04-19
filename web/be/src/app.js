const cors = require("cors");
const express = require("express");

const authRoutes = require("./routes/auth.routes");
const deviceRoutes = require("./routes/device.routes");
const healthRoutes = require("./routes/health.routes");
const readingRoutes = require("./routes/reading.routes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000"
  })
);
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/readings", readingRoutes);

module.exports = app;
