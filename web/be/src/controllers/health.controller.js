const { getDatabaseStatus } = require("../config/db");

function getHealth(_request, response) {
  response.json({
    status: "ok",
    service: "weather-be",
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getHealth
};
