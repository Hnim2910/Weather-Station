const mongoose = require("mongoose");

const weatherReadingSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    temperature: {
      type: Number,
      required: true
    },
    humidity: {
      type: Number,
      required: true
    },
    pressure: {
      type: Number,
      required: true
    },
    rain: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    windSpeed: {
      type: Number,
      required: true,
      min: 0
    },
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
