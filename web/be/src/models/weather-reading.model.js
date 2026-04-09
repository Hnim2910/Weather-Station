const mongoose = require("mongoose");

const weatherReadingSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true
    },
    temperature: Number,
    humidity: Number,
    pressure: Number,
    rainDigital: Number,
    rainAnalog: Number,
    windSpeed: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model("WeatherReading", weatherReadingSchema);
