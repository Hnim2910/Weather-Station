const WeatherReading = require("../models/weather-reading.model");

function validateReadingPayload(payload) {
  const requiredFields = [
    "deviceId",
    "temperature",
    "humidity",
    "pressure",
    "rain",
    "windSpeed"
  ];

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null) {
      return `Missing required field: ${field}`;
    }
  }

  if (typeof payload.deviceId !== "string" || payload.deviceId.trim() === "") {
    return "deviceId must be a non-empty string";
  }

  const numericFields = ["temperature", "humidity", "pressure", "rain", "windSpeed"];

  for (const field of numericFields) {
    if (typeof payload[field] !== "number" || Number.isNaN(payload[field])) {
      return `${field} must be a valid number`;
    }
  }

  if (payload.rain < 0 || payload.rain > 100) {
    return "rain must be between 0 and 100";
  }

  if (payload.windSpeed < 0) {
    return "windSpeed must be greater than or equal to 0";
  }

  return null;
}

async function createReading(request, response) {
  const validationError = validateReadingPayload(request.body);
  if (validationError) {
    return response.status(400).json({
      message: "Invalid reading payload",
      error: validationError
    });
  }

  try {
    const reading = await WeatherReading.create(request.body);

    return response.status(201).json({
      message: "Reading stored successfully",
      data: reading
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to store reading",
      error: error.message
    });
  }
}

async function listReadings(request, response) {
  const { deviceId, limit } = request.query;
  const filter = deviceId ? { deviceId } : {};
  const parsedLimit = Number.parseInt(limit, 10);
  const safeLimit =
    Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : Math.min(parsedLimit, 100);

  try {
    const readings = await WeatherReading.find(filter)
      .sort({ timestamp: -1 })
      .limit(safeLimit);

    return response.json({
      count: readings.length,
      data: readings
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to fetch readings",
      error: error.message
    });
  }
}

module.exports = {
  createReading,
  listReadings
};
