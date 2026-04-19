const mongoose = require("mongoose");

const alertRuleStateSchema = new mongoose.Schema(
  {
    temperatureHigh: {
      type: Boolean,
      default: false
    },
    windHigh: {
      type: Boolean,
      default: false
    },
    humidityHigh: {
      type: Boolean,
      default: false
    },
    rainHigh: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false
  }
);

const alertThresholdSchema = new mongoose.Schema(
  {
    temperatureHigh: {
      type: Number,
      default: 35
    },
    windHigh: {
      type: Number,
      default: 10
    },
    humidityHigh: {
      type: Number,
      default: 80
    },
    rainHigh: {
      type: Number,
      default: 80
    }
  },
  {
    _id: false
  }
);

const alertHistoryEntrySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    rule: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    reading: {
      temperature: Number,
      humidity: Number,
      pressure: Number,
      rain: Number,
      windSpeed: Number,
      timestamp: Date
    }
  },
  {
    _id: false
  }
);

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    pairedAt: {
      type: Date,
      default: null
    },
    lastSeenAt: {
      type: Date,
      default: null
    },
    alertState: {
      type: alertRuleStateSchema,
      default: () => ({})
    },
    alertSettings: {
      type: alertRuleStateSchema,
      default: () => ({
        temperatureHigh: true,
        windHigh: true,
        humidityHigh: true,
        rainHigh: true
      })
    },
    alertThresholds: {
      type: alertThresholdSchema,
      default: () => ({
        temperatureHigh: 35,
        windHigh: 10,
        humidityHigh: 80,
        rainHigh: 80
      })
    },
    alertHistory: {
      type: [alertHistoryEntrySchema],
      default: []
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

module.exports = mongoose.model("Device", deviceSchema);
