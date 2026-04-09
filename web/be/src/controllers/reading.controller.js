const WeatherReading = require("../models/weather-reading.model");

async function createReading(request, response) {
  const reading = await WeatherReading.create(request.body);

  response.status(201).json({
    message: "Reading stored successfully",
    data: reading
  });
}

async function listReadings(request, response) {
  const { deviceId } = request.query;
  const filter = deviceId ? { deviceId } : {};

  const readings = await WeatherReading.find(filter)
    .sort({ timestamp: -1 })
    .limit(20);

  response.json({
    data: readings
  });
}

module.exports = {
  createReading,
  listReadings
};
