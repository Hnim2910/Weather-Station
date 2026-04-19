const User = require("../models/user.model");
const { verifyAuthToken } = require("../utils/auth");

async function requireAuth(request, response, next) {
  try {
    const authorization = request.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return response.status(401).json({
        message: "Authentication required"
      });
    }

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub).select("-passwordHash");

    if (!user) {
      return response.status(401).json({
        message: "Invalid token"
      });
    }

    if (user.isLocked) {
      return response.status(403).json({
        message: "Account is locked"
      });
    }

    request.user = user;
    return next();
  } catch (error) {
    return response.status(401).json({
      message: "Invalid or expired token",
      error: error.message
    });
  }
}

async function optionalAuth(request, response, next) {
  try {
    const authorization = request.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      request.user = null;
      return next();
    }

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub).select("-passwordHash");

    request.user = user || null;
    return next();
  } catch (error) {
    request.user = null;
    return next();
  }
}

function requireRole(...roles) {
  return function roleMiddleware(request, response, next) {
    if (!request.user) {
      return response.status(401).json({
        message: "Authentication required"
      });
    }

    if (!roles.includes(request.user.role)) {
      return response.status(403).json({
        message: "Forbidden"
      });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole
};
