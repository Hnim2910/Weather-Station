const crypto = require("crypto");

function createVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createVerificationExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

module.exports = {
  createVerificationToken,
  createVerificationExpiry
};
