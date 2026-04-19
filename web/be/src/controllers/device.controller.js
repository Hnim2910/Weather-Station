const Device = require("../models/device.model");
const {
  getAlertRules,
  getDefaultAlertSettings,
  getDefaultAlertThresholds
} = require("./reading.controller");

function canAccessDevice(device, user) {
  if (user.role === "admin") {
    return true;
  }

  return Boolean(device.owner && device.owner.toString() === user._id.toString());
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

  if (!deviceId || typeof deviceId !== "string") {
    return response.status(400).json({
      message: "deviceId is required"
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
          pairedAt: new Date()
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
  getDeviceAlerts,
  updateDeviceAlerts
};
