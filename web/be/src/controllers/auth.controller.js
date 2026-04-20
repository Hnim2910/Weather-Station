const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Device = require("../models/device.model");
const { signAuthToken } = require("../utils/auth");
const {
  sendVerificationEmail,
  sendResetPasswordEmail
} = require("../services/mail.service");
const {
  createVerificationToken,
  createVerificationExpiry,
  createResetPasswordToken,
  createResetPasswordExpiry
} = require("../utils/verification");

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    isLocked: user.isLocked,
    createdAt: user.createdAt
  };
}

async function register(request, response) {
  const { name, email, password } = request.body;

  if (!email || !password) {
    return response.status(400).json({
      message: "email and password are required"
    });
  }

  if (password.length < 6) {
    return response.status(400).json({
      message: "password must be at least 6 characters"
    });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return response.status(409).json({
        message: "Email already in use"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = createVerificationToken();
    const verificationExpiresAt = createVerificationExpiry();
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "user",
      verificationToken,
      verificationExpiresAt
    });

    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      verificationToken
    });

    return response.status(201).json({
      message: "User registered successfully. Please verify your email.",
      user: sanitizeUser(user)
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to register user",
      error: error.message
    });
  }
}

async function login(request, response) {
  const { email, password } = request.body;

  if (!email || !password) {
    return response.status(400).json({
      message: "email and password are required"
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return response.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return response.status(401).json({
        message: "Invalid email or password"
      });
    }

    if (user.isLocked) {
      return response.status(403).json({
        message: "Account is locked"
      });
    }

    if (!user.isVerified) {
      return response.status(403).json({
        message: "Email is not verified"
      });
    }

    const token = signAuthToken(user);

    return response.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to login",
      error: error.message
    });
  }
}

async function verifyEmail(request, response) {
  const { token } = request.query;

  if (!token || typeof token !== "string") {
    return response.status(400).json({
      message: "Verification token is required"
    });
  }

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return response.status(400).json({
        message: "Invalid or expired verification token"
      });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpiresAt = null;
    await user.save();

    return response.json({
      message: "Email verified successfully"
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to verify email",
      error: error.message
    });
  }
}

async function resendVerification(request, response) {
  const { email } = request.body;

  if (!email) {
    return response.status(400).json({
      message: "email is required"
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return response.status(404).json({
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return response.status(400).json({
        message: "Email is already verified"
      });
    }

    user.verificationToken = createVerificationToken();
    user.verificationExpiresAt = createVerificationExpiry();
    await user.save();

    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      verificationToken: user.verificationToken
    });

    return response.json({
      message: "Verification email sent"
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to resend verification email",
      error: error.message
    });
  }
}

async function forgotPassword(request, response) {
  const { email } = request.body;

  if (!email) {
    return response.status(400).json({
      message: "email is required"
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      user.resetPasswordToken = createResetPasswordToken();
      user.resetPasswordExpiresAt = createResetPasswordExpiry();
      await user.save();

      await sendResetPasswordEmail({
        email: user.email,
        name: user.name,
        resetToken: user.resetPasswordToken
      });
    }

    return response.json({
      message: "If the email exists, a password reset link has been sent."
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to process forgot password request",
      error: error.message
    });
  }
}

async function resetPassword(request, response) {
  const { token, password } = request.body;

  if (!token || typeof token !== "string") {
    return response.status(400).json({
      message: "reset token is required"
    });
  }

  if (!password || typeof password !== "string") {
    return response.status(400).json({
      message: "password is required"
    });
  }

  if (password.length < 6) {
    return response.status(400).json({
      message: "password must be at least 6 characters"
    });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return response.status(400).json({
        message: "Invalid or expired reset token"
      });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    return response.json({
      message: "Password reset successfully"
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to reset password",
      error: error.message
    });
  }
}

function getMe(request, response) {
  return response.json({
    user: request.user
  });
}

async function listUsers(request, response) {
  try {
    const users = await User.find({})
      .select("-passwordHash -verificationToken -verificationExpiresAt")
      .sort({ createdAt: -1 })
      .lean();

    const devices = await Device.find({ owner: { $ne: null } })
      .select("deviceId owner")
      .lean();

    const deviceCountByOwner = new Map();

    for (const device of devices) {
      const ownerId = String(device.owner);
      const currentCount = deviceCountByOwner.get(ownerId) || 0;
      deviceCountByOwner.set(ownerId, currentCount + 1);
    }

    const data = users.map((user) => ({
      ...sanitizeUser(user),
      deviceCount: deviceCountByOwner.get(String(user._id)) || 0,
      online: (deviceCountByOwner.get(String(user._id)) || 0) > 0
    }));

    return response.json({
      count: data.length,
      data
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to fetch users",
      error: error.message
    });
  }
}

async function updateUserLockStatus(request, response) {
  const { userId } = request.params;
  const { isLocked } = request.body;

  if (typeof isLocked !== "boolean") {
    return response.status(400).json({
      message: "isLocked must be a boolean"
    });
  }

  if (request.user._id.toString() === userId) {
    return response.status(400).json({
      message: "You cannot lock or unlock your own account"
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return response.status(404).json({
        message: "User not found"
      });
    }

    if (user.role === "admin") {
      return response.status(400).json({
        message: "Admin accounts cannot be modified here"
      });
    }

    user.isLocked = isLocked;
    await user.save();

    return response.json({
      message: isLocked ? "User locked successfully" : "User unlocked successfully",
      user: sanitizeUser(user)
    });
  } catch (error) {
    return response.status(500).json({
      message: "Failed to update user lock status",
      error: error.message
    });
  }
}

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
  listUsers,
  updateUserLockStatus
};
