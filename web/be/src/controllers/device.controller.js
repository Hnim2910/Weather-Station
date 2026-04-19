const Device = require("../models/device.model");
const WeatherReading = require("../models/weather-reading.model");
const { HANOI_DISTRICTS } = require("../constants/hanoi-districts");
const {
  getAlertRules,
  getDefaultAlertSettings,
  getDefaultAlertThresholds
} = require("./reading.controller");

const PERIOD_CONFIG = {
  day: {
    bucketCount: 24,
    createBucketStart: (now) => {
      const start = new Date(now);
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() - 23);
      return start;
    },
    moveBucket: (date, step) => {
      const next = new Date(date);
      next.setHours(next.getHours() + step);
      return next;
    },
    getBucketKey: (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}`,
    getLabel: (date) =>
      date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      }),
    floorToBucket: (timestamp) => {
      const next = new Date(timestamp);
      next.setMinutes(0, 0, 0);
      return next;
    }
  },
  month: {
    bucketCount: 30,
    createBucketStart: (now) => {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 29);
      return start;
    },
    moveBucket: (date, step) => {
      const next = new Date(date);
      next.setDate(next.getDate() + step);
      return next;
    },
    getBucketKey: (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`,
    getLabel: (date) =>
      date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short"
      }),
    floorToBucket: (timestamp) => {
      const next = new Date(timestamp);
      next.setHours(0, 0, 0, 0);
      return next;
    }
  },
  year: {
    bucketCount: 12,
    createBucketStart: (now) => {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setMonth(start.getMonth() - 11);
      return start;
    },
    moveBucket: (date, step) => {
      const next = new Date(date);
      next.setMonth(next.getMonth() + step);
      return next;
    },
    getBucketKey: (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    getLabel: (date) =>
      date.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric"
      }),
    floorToBucket: (timestamp) => new Date(timestamp.getFullYear(), timestamp.getMonth(), 1)
  }
};

function canAccessDevice(device, user) {
  if (user.role === "admin") {
    return true;
  }

  return Boolean(device.owner && device.owner.toString() === user._id.toString());
}

function normalizeDistrict(district) {
  if (typeof district !== "string") {
    return null;
  }

  const trimmed = district.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidDistrict(district) {
  return district === null || HANOI_DISTRICTS.includes(district);
}

function buildEmptyTimeline(period) {
  const config = PERIOD_CONFIG[period];
  const start = config.createBucketStart(new Date());

  return Array.from({ length: config.bucketCount }, (_, index) => {
    const bucketDate = config.moveBucket(start, index);
    return {
      label: config.getLabel(bucketDate),
      temperature: null,
      humidity: null,
      windSpeed: null,
      rain: null
    };
  });
}

function buildTimelineFromReadings(readings, period) {
  const config = PERIOD_CONFIG[period];
  const start = config.createBucketStart(new Date());
  const bucketMap = new Map();

  for (let index = 0; index < config.bucketCount; index += 1) {
    const bucketDate = config.moveBucket(start, index);
    const key = config.getBucketKey(bucketDate);
    bucketMap.set(key, {
      label: config.getLabel(bucketDate),
      temperatureSum: 0,
      humiditySum: 0,
      windSpeedSum: 0,
      rainSum: 0,
      count: 0
    });
  }

  for (const reading of readings) {
    const timestamp = new Date(reading.timestamp);
    const bucketDate = config.floorToBucket(timestamp);
    const key = config.getBucketKey(bucketDate);
    const bucket = bucketMap.get(key);

    if (!bucket) {
      continue;
    }

    bucket.temperatureSum += reading.temperature;
    bucket.humiditySum += reading.humidity;
    bucket.windSpeedSum += reading.windSpeed;
    bucket.rainSum += reading.rain;
    bucket.count += 1;
  }

  return Array.from(bucketMap.values()).map((bucket) => ({
    label: bucket.label,
    temperature:
      bucket.count > 0 ? Number((bucket.temperatureSum / bucket.count).toFixed(1)) : null,
    humidity:
      bucket.count > 0 ? Number((bucket.humiditySum / bucket.count).toFixed(1)) : null,
    windSpeed:
      bucket.count > 0 ? Number((bucket.windSpeedSum / bucket.count).toFixed(1)) : null,
    rain: bucket.count > 0 ? Number((bucket.rainSum / bucket.count).toFixed(1)) : null
  }));
}

async function listDevices(request, response) {
  try {
    const filter = request.user.role === "admin" ? {} : { owner: request.user._id };
    const devices = await Device.find(filter)
      .populate("owner", "name email role")
      .sort({ updatedAt: -1 });

    return response.json({
      count: devices.length,
      data: devices
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to fetch devices",
      error: error.message
    });
  }
}

async function claimDevice(request, response) {
  const { deviceId } = request.body;
  const district = normalizeDistrict(request.body.district);

  if (!deviceId || typeof deviceId !== "string") {
    return response.status(400).json({
      message: "deviceId is required"
    });
  }

  if (!isValidDistrict(district)) {
    return response.status(400).json({
      message: "Invalid district"
    });
  }

  try {
    const existingDevice = await Device.findOne({ deviceId });

    if (
      existingDevice &&
      existingDevice.owner &&
      existingDevice.owner.toString() !== request.user._id.toString() &&
      request.user.role !== "admin"
    ) {
      return response.status(409).json({
        message: "Device is already owned by another user"
      });
    }

    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          owner: request.user._id,
          pairedAt: new Date(),
          ...(district ? { district } : {})
        }
      },
      {
        new: true,
        upsert: true
      }
    ).populate("owner", "name email role");

    return response.json({
      message: "Device claimed successfully",
      data: device
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to claim device",
      error: error.message
    });
  }
}

async function getDistrictAnalytics(request, response) {
  const requestedDistrict = normalizeDistrict(request.query.district);
  const district = requestedDistrict || "all";
  const period = typeof request.query.period === "string" ? request.query.period : "day";

  if (!PERIOD_CONFIG[period]) {
    return response.status(400).json({
      message: "Invalid period"
    });
  }

  if (district !== "all" && !isValidDistrict(district)) {
    return response.status(400).json({
      message: "Invalid district"
    });
  }

  try {
    const deviceFilter = district === "all" ? {} : { district };
    const devices = await Device.find(deviceFilter).populate("owner", "name email role");
    const deviceIds = devices.map((device) => device.deviceId);

    if (deviceIds.length === 0) {
      return response.json({
        district,
        period,
        availableDistricts: HANOI_DISTRICTS,
        deviceCount: 0,
        onlineDeviceCount: 0,
        readingsCount: 0,
        current: {
          temperature: null,
          humidity: null,
          windSpeed: null,
          rain: null,
          pressure: null,
          lastReadingAt: null
        },
        timeline: buildEmptyTimeline(period)
      });
    }

    const config = PERIOD_CONFIG[period];
    const rangeStart = config.createBucketStart(new Date());

    const [readings, latestAggregate] = await Promise.all([
      WeatherReading.find({
        deviceId: { $in: deviceIds },
        timestamp: { $gte: rangeStart }
      })
        .sort({ timestamp: 1 })
        .lean(),
      WeatherReading.aggregate([
        {
          $match: {
            deviceId: { $in: deviceIds }
          }
        },
        {
          $sort: {
            timestamp: -1
          }
        },
        {
          $group: {
            _id: "$deviceId",
            latest: { $first: "$$ROOT" }
          }
        },
        {
          $replaceRoot: {
            newRoot: "$latest"
          }
        },
        {
          $group: {
            _id: null,
            temperature: { $avg: "$temperature" },
            humidity: { $avg: "$humidity" },
            windSpeed: { $avg: "$windSpeed" },
            rain: { $avg: "$rain" },
            pressure: { $avg: "$pressure" },
            lastReadingAt: { $max: "$timestamp" }
          }
        }
      ])
    ]);

    const currentAggregate = latestAggregate[0] || null;

    return response.json({
      district,
      period,
      availableDistricts: HANOI_DISTRICTS,
      deviceCount: devices.length,
      onlineDeviceCount: devices.filter((device) => Boolean(device.owner)).length,
      readingsCount: readings.length,
      current: {
        temperature: currentAggregate ? Number(currentAggregate.temperature?.toFixed(1) || 0) : null,
        humidity: currentAggregate ? Number(currentAggregate.humidity?.toFixed(1) || 0) : null,
        windSpeed: currentAggregate ? Number(currentAggregate.windSpeed?.toFixed(1) || 0) : null,
        rain: currentAggregate ? Number(currentAggregate.rain?.toFixed(1) || 0) : null,
        pressure: currentAggregate ? Number(currentAggregate.pressure?.toFixed(1) || 0) : null,
        lastReadingAt: currentAggregate?.lastReadingAt || null
      },
      timeline: buildTimelineFromReadings(readings, period)
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to fetch district analytics",
      error: error.message
    });
  }
}

async function unclaimDevice(request, response) {
  const { deviceId } = request.params;

  try {
    const device = await Device.findOne({ deviceId });

    if (!device) {
      return response.status(404).json({
        message: "Device not found"
      });
    }

    const isOwner = device.owner && device.owner.toString() === request.user._id.toString();
    if (!isOwner && request.user.role !== "admin") {
      return response.status(403).json({
        message: "Forbidden"
      });
    }

    device.owner = null;
    device.pairedAt = null;
    await device.save();

    return response.json({
      message: "Device unclaimed successfully",
      data: device
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to unclaim device",
      error: error.message
    });
  }
}

async function adminForceUnclaimDevice(request, response) {
  const { deviceId } = request.params;

  try {
    const device = await Device.findOne({ deviceId }).populate("owner", "name email role");

    if (!device) {
      return response.status(404).json({
        message: "Device not found"
      });
    }

    device.owner = null;
    device.pairedAt = null;
    await device.save();

    return response.json({
      message: "Device force-unpaired successfully",
      data: device
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to force-unpair device",
      error: error.message
    });
  }
}

async function getDeviceAlerts(request, response) {
  const { deviceId } = request.params;

  try {
    const device = await Device.findOne({ deviceId });

    if (!device) {
      return response.status(404).json({
        message: "Device not found"
      });
    }

    if (!canAccessDevice(device, request.user)) {
      return response.status(403).json({
        message: "Forbidden"
      });
    }

    return response.json({
      deviceId: device.deviceId,
      rules: getAlertRules(),
      settings: getDefaultAlertSettings(device),
      thresholds: getDefaultAlertThresholds(device),
      history: device.alertHistory || []
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to fetch device alerts",
      error: error.message
    });
  }
}

async function updateDeviceAlerts(request, response) {
  const { deviceId } = request.params;
  const allowedKeys = ["temperatureHigh", "windHigh", "humidityHigh", "rainHigh"];

  try {
    const device = await Device.findOne({ deviceId });

    if (!device) {
      return response.status(404).json({
        message: "Device not found"
      });
    }

    if (!canAccessDevice(device, request.user)) {
      return response.status(403).json({
        message: "Forbidden"
      });
    }

    const nextSettings = {
      ...getDefaultAlertSettings(device)
    };
    const nextThresholds = {
      ...getDefaultAlertThresholds(device)
    };

    for (const key of allowedKeys) {
      if (typeof request.body[key] === "boolean") {
        nextSettings[key] = request.body[key];
      }

      if (
        typeof request.body[`${key}Threshold`] === "number" &&
        !Number.isNaN(request.body[`${key}Threshold`])
      ) {
        nextThresholds[key] = request.body[`${key}Threshold`];
      }
    }

    if (nextThresholds.temperatureHigh < -100 || nextThresholds.temperatureHigh > 200) {
      return response.status(400).json({
        message: "Temperature threshold is out of range"
      });
    }

    if (nextThresholds.windHigh < 0 || nextThresholds.windHigh > 200) {
      return response.status(400).json({
        message: "Wind speed threshold is out of range"
      });
    }

    if (nextThresholds.humidityHigh < 0 || nextThresholds.humidityHigh > 100) {
      return response.status(400).json({
        message: "Humidity threshold must be between 0 and 100"
      });
    }

    if (nextThresholds.rainHigh < 0 || nextThresholds.rainHigh > 100) {
      return response.status(400).json({
        message: "Rain wetness threshold must be between 0 and 100"
      });
    }

    device.alertSettings = nextSettings;
    device.alertThresholds = nextThresholds;

    for (const key of allowedKeys) {
      if (!nextSettings[key]) {
        device.alertState[key] = false;
      }
    }

    await device.save();

    return response.json({
      message: "Alert settings updated successfully",
      deviceId: device.deviceId,
      rules: getAlertRules(),
      settings: getDefaultAlertSettings(device),
      thresholds: getDefaultAlertThresholds(device),
      history: device.alertHistory || []
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to update device alerts",
      error: error.message
    });
  }
}

module.exports = {
  listDevices,
  claimDevice,
  unclaimDevice,
  adminForceUnclaimDevice,
  getDistrictAnalytics,
  getDeviceAlerts,
  updateDeviceAlerts
};
