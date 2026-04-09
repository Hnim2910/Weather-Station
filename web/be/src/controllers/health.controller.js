function getHealth(_request, response) {
  response.json({
    status: "ok",
    service: "weather-be",
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getHealth
};
