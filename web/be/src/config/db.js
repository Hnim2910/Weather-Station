const mongoose = require("mongoose");

async function connectDatabase() {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/weather_station";

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");
}

function getDatabaseStatus() {
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
}

module.exports = {
  connectDatabase,
  getDatabaseStatus
};
