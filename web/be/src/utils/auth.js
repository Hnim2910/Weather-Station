const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || "change-me-in-env";
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    },
    getJwtSecret(),
    {
      expiresIn: "7d"
    }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signAuthToken,
  verifyAuthToken
};
