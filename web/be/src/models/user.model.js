const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user"
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    verificationToken: {
      type: String,
      default: null,
      index: true
    },
    verificationExpiresAt: {
      type: Date,
      default: null
    },
    resetPasswordToken: {
      type: String,
      default: null,
      index: true
    },
    resetPasswordExpiresAt: {
      type: Date,
      default: null
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
