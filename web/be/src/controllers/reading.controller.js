const WeatherReading = require("../models/weather-reading.model");
const Device = require("../models/device.model");
const { sendThresholdAlertEmail } = require("../services/mail.service");

const ALERT_THRESHOLDS = {
  temperatureHigh: {
    key: "temperatureHigh",
    label: "High temperature",
    comparator: ">=",
    unit: "C",
    isTriggered: (reading, threshold) => reading.temperature >= threshold,
    getValue: (reading) => `${reading.temperature.toFixed(1)} C`
  },
  windHigh: {
    key: "windHigh",
    label: "High wind speed",
    comparator: ">",
    unit: "m/s",
    isTriggered: (reading, threshold) => reading.windSpeed > threshold,
    getValue: (reading) => `${reading.windSpeed.toFixed(1)} m/s`
  },
  humidityHigh: {
    key: "humidityHigh",
    label: "High humidity",
    comparator: ">=",
    unit: "%",
    isTriggered: (reading, threshold) => reading.humidity >= threshold,
    getValue: (reading) => `${reading.humidity.toFixed(1)} %`
  },
  rainHigh: {
    key: "rainHigh",
    label: "High rain sensor wetness",
    comparator: ">=",
    unit: "%",
    isTriggered: (reading, threshold) => reading.rain >= threshold,
    getValue: (reading) => `${reading.rain.toFixed(0)} %`
  }
};

function getDefaultAlertSettings(device) {
  return {
    temperatureHigh: device?.alertSettings?.temperatureHigh ?? true,
    windHigh: device?.alertSettings?.windHigh ?? true,
    humidityHigh: device?.alertSettings?.humidityHigh ?? true,
    rainHigh: device?.alertSettings?.rainHigh ?? true
  };
}

function getDefaultAlertThresholds(device) {
  return {
    temperatureHigh: device?.alertThresholds?.temperatureHigh ?? 35,
    windHigh: device?.alertThresholds?.windHigh ?? 10,
    humidityHigh: device?.alertThresholds?.humidityHigh ?? 80,
    rainHigh: device?.alertThresholds?.rainHigh ?? 80
  };
}

function getDefaultAlertState(device) {
  return {
    temperatureHigh: device?.alertState?.temperatureHigh ?? false,
    windHigh: device?.alertState?.windHigh ?? false,
    humidityHigh: device?.alertState?.humidityHigh ?? false,
    rainHigh: device?.alertState?.rainHigh ?? false
  };
}

function getAlertRules() {
  return Object.values(ALERT_THRESHOLDS).map((config) => ({
    key: config.key,
    label: config.label,
    comparator: config.comparator,
    unit: config.unit
  }));
}

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

async function processThresholdAlerts({ reading, device }) {
  if (!device?.owner || !device.owner.email || device.owner.isVerified === false) {
    return;
  }

  const currentState = getDefaultAlertState(device);
  const nextState = { ...currentState };
  const alertSettings = getDefaultAlertSettings(device);
  const alertThresholds = getDefaultAlertThresholds(device);
  const triggeredAlerts = [];

  for (const [key, config] of Object.entries(ALERT_THRESHOLDS)) {
    if (!alertSettings[key]) {
      nextState[key] = false;
      continue;
    }

    const threshold = alertThresholds[key];
    const isNowTriggered = config.isTriggered(reading, threshold);
    nextState[key] = isNowTriggered;

    if (isNowTriggered && !currentState[key]) {
      triggeredAlerts.push({
        key,
        label: config.label,
        rule: `${config.comparator} ${threshold} ${config.unit}`,
        value: config.getValue(reading)
      });
    }
  }

  const hasStateChange = Object.keys(nextState).some(
    (key) => nextState[key] !== currentState[key]
  );

  if (triggeredAlerts.length > 0) {
    const historyEntries = triggeredAlerts.map((alert) => ({
      ...alert,
      sentAt: new Date(),
      reading: {
        temperature: reading.temperature,
        humidity: reading.humidity,
        pressure: reading.pressure,
        rain: reading.rain,
        windSpeed: reading.windSpeed,
        timestamp: reading.timestamp || new Date()
      }
    }));

    device.alertHistory = [...historyEntries, ...(device.alertHistory || [])].slice(0, 50);
  }

  if (hasStateChange) {
    device.alertState = nextState;
  }

  if (triggeredAlerts.length > 0 || hasStateChange) {
    await device.save();
  }

  if (triggeredAlerts.length === 0) {
    return;
  }

  await sendThresholdAlertEmail({
    email: device.owner.email,
    name: device.owner.name,
    deviceId: device.deviceId,
    triggeredAlerts,
    reading
  });
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
    const deviceFilter = { deviceId: request.body.deviceId };
    const existingDevice = await Device.findOne(deviceFilter);

    if (
      request.user &&
      existingDevice &&
      existingDevice.owner &&
      existingDevice.owner.toString() !== request.user._id.toString() &&
      request.user.role !== "admin"
    ) {
      return response.status(403).json({
        message: "You do not have access to post readings for this device"
      });
    }

    const reading = await WeatherReading.create(request.body);
    const devicePatch = {
      lastSeenAt: new Date()
    };

    if (request.user && (!existingDevice || !existingDevice.owner)) {
      devicePatch.owner = request.user._id;
      devicePatch.pairedAt = new Date();
    }

    await Device.findOneAndUpdate(
      deviceFilter,
      {
        $set: devicePatch
      },
      {
        new: true,
        upsert: true
      }
    );

    const hydratedDevice = await Device.findOne(deviceFilter).populate(
      "owner",
      "name email isVerified"
    );

    await processThresholdAlerts({
      reading,
      device: hydratedDevice
    });

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
  const parsedLimit = Number.parseInt(limit, 10);
  const safeLimit =
    Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : Math.min(parsedLimit, 100);

  try {
    let filter = {};

    if (request.user.role === "admin") {
      filter = deviceId ? { deviceId } : {};
    } else if (deviceId) {
      const device = await Device.findOne({
        deviceId,
        owner: request.user._id
      });

      if (!device) {
        return response.status(403).json({
          message: "You do not have access to this device"
        });
      }

      filter = { deviceId };
    } else {
      const ownedDevices = await Device.find({ owner: request.user._id }).select("deviceId");
      const deviceIds = ownedDevices.map((device) => device.deviceId);
      filter = { deviceId: { $in: deviceIds } };
    }

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
  ALERT_THRESHOLDS,
  getAlertRules,
  getDefaultAlertSettings,
  getDefaultAlertThresholds,
  createReading,
  listReadings
};
