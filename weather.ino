#include <Wire.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

// Hardware pin mapping for the ESP32 weather station board.
#define SDA_PIN 21
#define SCL_PIN 22
#define AHT20_ADDR 0x38
#define RAIN_AO 32
#define RAIN_DO 2
#define RAIN_TIP_PIN 17
#define HALL_PIN 27
#define BUTTON_PIN 18

// BLE bridge service for live readings.
#define BLE_BRIDGE_SERVICE_UUID "6c123450-52d1-4f36-8a87-2d7e4f510101"
#define BLE_BRIDGE_INFO_UUID "6c123450-52d1-4f36-8a87-2d7e4f510102"
#define BLE_BRIDGE_READING_UUID "6c123450-52d1-4f36-8a87-2d7e4f510103"
#define BLE_BRIDGE_CONTROL_UUID "6c123450-52d1-4f36-8a87-2d7e4f510104"
#define BLE_BRIDGE_STATUS_UUID "6c123450-52d1-4f36-8a87-2d7e4f510105"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp;

// BLE bridge objects are kept global because they are shared across setup(),
// callbacks, and the main loop notification path.
BLEServer* bleServer = nullptr;
BLECharacteristic* bridgeInfoCharacteristic = nullptr;
BLECharacteristic* bridgeReadingCharacteristic = nullptr;
BLECharacteristic* bridgeStatusCharacteristic = nullptr;

// deviceId is derived from the ESP32 MAC, so each board keeps a stable unique ID.
String deviceId;

// Runtime state flags for optional sensors and BLE connection state.
bool bmpReady = false;
bool bleClientConnected = false;
bool bleBridgeStreamingEnabled = true;
bool oledReady = false;
bool displaySleeping = false;

// The OLED screen is now user-driven by a push button instead of auto-rotating.
int screenState = 0;
int lastButtonReading = HIGH;
int stableButtonState = HIGH;
int buttonIdleState = HIGH;
unsigned long lastButtonDebounceTime = 0;
unsigned long lastUserInteractionTime = 0;
const unsigned long buttonDebounceDelay = 50;
const unsigned long displaySleepTimeout = 300000;

unsigned long lastSerialPrintTime = 0;
const long serialInterval = 2000;
unsigned long lastBleNotifyTime = 0;
const long bleNotifyInterval = 2000;

// Wind speed is computed from hall sensor pulses counted inside an interrupt.
volatile int pulseCount = 0;
unsigned long lastWindCalcTime = 0;
float windSpeed = 0.0;

// Tipping bucket rainfall is measured by a second hall sensor on a separate GPIO.
volatile unsigned long rainTipCount = 0;
const float RAIN_MM_PER_TIP = 0.2f;
float rainRateMmPerHour = 0.0f;
unsigned long lastRainRateCalcTime = 0;
unsigned long lastRainTipSnapshot = 0;

void wakeDisplay() {
  if (!oledReady || !displaySleeping) {
    return;
  }

  display.ssd1306_command(SSD1306_DISPLAYON);
  displaySleeping = false;
}

void sleepDisplay() {
  if (!oledReady || displaySleeping) {
    return;
  }

  display.clearDisplay();
  display.display();
  display.ssd1306_command(SSD1306_DISPLAYOFF);
  displaySleeping = true;
}

void handleButtonPress(unsigned long currentMillis) {
  // Wake-up uses one press; changing the screen requires the next press.
  if (displaySleeping) {
    wakeDisplay();
    lastUserInteractionTime = currentMillis;
    return;
  }

  screenState = !screenState;
  lastUserInteractionTime = currentMillis;
}

void pollButton(unsigned long currentMillis) {
  // Treat whichever level is present at boot as the idle state, so the module
  // can be either active-low or active-high without code changes.
  int reading = digitalRead(BUTTON_PIN);

  if (reading != lastButtonReading) {
    lastButtonDebounceTime = currentMillis;
  }

  if ((currentMillis - lastButtonDebounceTime) >= buttonDebounceDelay && reading != stableButtonState) {
    stableButtonState = reading;
    if (stableButtonState != buttonIdleState) {
      handleButtonPress(currentMillis);
    }
  }

  lastButtonReading = reading;
}

void renderDisplay(float temperature, float humidity, float rainPercent, float currentWindSpeed) {
  if (!oledReady || displaySleeping) {
    return;
  }

  display.clearDisplay();

  if (screenState == 0) {
    // --- SCREEN 1: TEMPERATURE & HUMIDITY ---
    display.setTextSize(1);
    display.setCursor(20, 0);
    display.print("TEMP & HUMIDITY");

    display.setTextSize(2);
    display.setCursor(0, 20);
    display.print("T:");
    display.print(temperature, 1);
    display.print(" C");

    display.setCursor(0, 45);
    display.print("H:");
    display.print(humidity, 1);
    display.print(" %");
  } else {
    // --- SCREEN 2: WIND, WETNESS & RAINFALL ---
    display.setTextSize(1);
    display.setCursor(28, 0);
    display.print("RAIN & WIND");

    display.setTextSize(1);
    display.setCursor(0, 18);
    display.print("Wind");
    display.setTextSize(2);
    display.setCursor(42, 14);
    display.print(currentWindSpeed, 1);
    display.setTextSize(1);
    display.setCursor(100, 22);
    display.print("m/s");

    display.setTextSize(1);
    display.setCursor(0, 35);
    display.print("Wet");
    display.setTextSize(2);
    display.setCursor(42, 31);
    display.print(rainPercent, 0);
    display.setTextSize(1);
    display.setCursor(102, 39);
    display.print("%");

    display.setTextSize(1);
    display.setCursor(0, 52);
    display.print("Rain");
    display.setTextSize(2);
    display.setCursor(42, 48);
    display.print(rainRateMmPerHour, 1);
    display.setTextSize(1);
    display.setCursor(94, 56);
    display.print("mm/h");
  }

  display.display();
}

void updateBridgeStatus(const String& statusMessage) {
  Serial.print("BLE BRIDGE: ");
  Serial.println(statusMessage);

  if (bridgeStatusCharacteristic != nullptr) {
    bridgeStatusCharacteristic->setValue(statusMessage.c_str());
    if (bleClientConnected) {
      bridgeStatusCharacteristic->notify();
    }
  }
}

String buildDeviceId() {
  // Use the efuse MAC to generate a unique and repeatable device ID.
  uint64_t chipId = ESP.getEfuseMac();
  char idBuffer[24];
  snprintf(
    idBuffer,
    sizeof(idBuffer),
    "ws-%04X%08X",
    (uint16_t)(chipId >> 32),
    (uint32_t)chipId
  );
  return String(idBuffer);
}

class WeatherBleServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    // Mark the client as connected so notifications can be pushed safely.
    bleClientConnected = true;
    updateBridgeStatus(bleBridgeStreamingEnabled ? "STREAMING" : "STOPPED");
  }

  void onDisconnect(BLEServer* server) override {
    // Resume advertising immediately so the web client can reconnect later.
    bleClientConnected = false;
    updateBridgeStatus("CLIENT_DISCONNECTED");
    BLEDevice::startAdvertising();
  }
};

class BridgeControlCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
    // The browser controls the bridge with simple START/STOP/STATUS commands.
    String command = String(characteristic->getValue().c_str());
    command.trim();
    command.toUpperCase();

    if (command == "START") {
      bleBridgeStreamingEnabled = true;
      updateBridgeStatus("STREAMING");
      return;
    }

    if (command == "STOP") {
      bleBridgeStreamingEnabled = false;
      updateBridgeStatus("STOPPED");
      return;
    }

    if (command == "STATUS") {
      updateBridgeStatus(bleBridgeStreamingEnabled ? "STREAMING" : "STOPPED");
      return;
    }

    updateBridgeStatus("ERROR:UNKNOWN_COMMAND");
  }
};

void startBleServices() {
  // Expose one BLE service that contains device info, live readings and bridge status.
  BLEDevice::init("WS-Bridge");

  bleServer = BLEDevice::createServer();
  bleServer->setCallbacks(new WeatherBleServerCallbacks());

  BLEService* bridgeService = bleServer->createService(BLE_BRIDGE_SERVICE_UUID);

  bridgeInfoCharacteristic = bridgeService->createCharacteristic(
    BLE_BRIDGE_INFO_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  String bridgeInfo = "{\"deviceId\":\"" + deviceId + "\",\"mode\":\"ble-bridge\"}";
  bridgeInfoCharacteristic->setValue(bridgeInfo.c_str());

  bridgeReadingCharacteristic = bridgeService->createCharacteristic(
    BLE_BRIDGE_READING_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  bridgeReadingCharacteristic->setValue("{\"status\":\"waiting\"}");
  bridgeReadingCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic* bridgeControlCharacteristic = bridgeService->createCharacteristic(
    BLE_BRIDGE_CONTROL_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  bridgeControlCharacteristic->setCallbacks(new BridgeControlCallback());

  bridgeStatusCharacteristic = bridgeService->createCharacteristic(
    BLE_BRIDGE_STATUS_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  bridgeStatusCharacteristic->setValue("READY");
  bridgeStatusCharacteristic->addDescriptor(new BLE2902());

  bridgeService->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(BLE_BRIDGE_SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  updateBridgeStatus("READY");
}

String buildPayload(float temperature, float humidity, float pressure, float rainPercent, float currentWindSpeed) {
  // Keep payload format aligned with the backend reading schema.
  String payload = "{\"deviceId\":\"";
  payload += deviceId;
  payload += "\",\"temperature\":";
  payload += String(temperature, 1);
  payload += ",\"humidity\":";
  payload += String(humidity, 1);
  payload += ",\"pressure\":";
  payload += String(pressure, 1);
  payload += ",\"rain\":";
  payload += String(rainPercent, 0);
  payload += ",\"windSpeed\":";
  payload += String(currentWindSpeed, 1);
  payload += ",\"rainRateMmPerHour\":";
  payload += String(rainRateMmPerHour, 1);
  payload += ",\"rainTipCount\":";
  payload += String(rainTipCount);
  payload += "}";

  return payload;
}

void notifyBleReading(const String& payload) {
  // Skip notifications if streaming is disabled or BLE has not been initialized.
  if (!bleBridgeStreamingEnabled || bridgeReadingCharacteristic == nullptr) {
    return;
  }

  bridgeReadingCharacteristic->setValue(payload.c_str());
  if (bleClientConnected) {
    bridgeReadingCharacteristic->notify();
  }
}

void scanI2CDevices() {
  // Diagnostic helper used only when a sensor cannot be found at startup.
  Serial.println("Scanning I2C...");
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.print("Found I2C device at 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
    }
  }
}

void IRAM_ATTR countPulse() {
  // Keep the ISR minimal: only increment the pulse counter and return.
  pulseCount++;
}

void IRAM_ATTR countRainTip() {
  // Each tipping-bucket flip produces one pulse from the rain hall sensor.
  rainTipCount++;
}

void setup() {
  // Initialize serial, I2C and the device ID before starting BLE and sensors.
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  deviceId = buildDeviceId();
  Serial.print("Device ID: ");
  Serial.println(deviceId);

  startBleServices();

  // The firmware keeps running even if the OLED is absent.
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println(F("Khong tim thay OLED SSD1306"));
  } else {
    oledReady = true;
    display.clearDisplay();
    display.setTextColor(WHITE);
    display.setTextSize(1);
    display.setCursor(0, 10);
    display.println("Weather Station...");
    display.display();
  }

  // The firmware also keeps running if individual sensors are missing.
  if (!aht.begin(&Wire, 0, AHT20_ADDR)) {
    Serial.println("Khong tim thay AHT20!");
  }

  // Try both common BMP280 addresses before reporting the sensor as unavailable.
  bmpReady = bmp.begin(0x76);
  if (!bmpReady) {
    bmpReady = bmp.begin(0x77);
  }

  if (!bmpReady) {
    Serial.println("Khong tim thay BMP280!");
    scanI2CDevices();
  } else {
    Serial.println("BMP280 da san sang");
  }

  pinMode(RAIN_AO, INPUT);
  pinMode(RAIN_DO, INPUT);
  pinMode(RAIN_TIP_PIN, INPUT_PULLUP);
  pinMode(HALL_PIN, INPUT_PULLUP);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  // Count rainfall bucket tips with a dedicated hall sensor interrupt.
  attachInterrupt(digitalPinToInterrupt(RAIN_TIP_PIN), countRainTip, FALLING);
  // Count wind pulses with an interrupt instead of polling the hall sensor.
  attachInterrupt(digitalPinToInterrupt(HALL_PIN), countPulse, FALLING);
  lastButtonReading = digitalRead(BUTTON_PIN);
  stableButtonState = lastButtonReading;
  buttonIdleState = lastButtonReading;
  lastUserInteractionTime = millis();

  // Small startup delay lets peripherals stabilize before entering the main loop.
  delay(2000);
}

void loop() {
  // One loop pass reads sensors, updates derived values, then refreshes BLE, Serial and OLED.
  unsigned long currentMillis = millis();
  pollButton(currentMillis);

  sensors_event_t humidityEvent;
  sensors_event_t temperatureEvent;
  aht.getEvent(&humidityEvent, &temperatureEvent);

  float temperature = temperatureEvent.temperature;
  float humidity = humidityEvent.relative_humidity;

  // Pressure is optional because BMP280 may fail to initialize.
  float pressure = NAN;
  if (bmpReady) {
    pressure = bmp.readPressure() / 100.0;
  }

  // Normalize the analog rain sensor to a 0-100 wetness percentage for the UI/backend.
  int rainRaw = analogRead(RAIN_AO);
  float rainPercent = map(rainRaw, 4095, 0, 0, 100);
  if (rainPercent < 0) {
    rainPercent = 0;
  }
  if (rainPercent > 100) {
    rainPercent = 100;
  }

  // Convert pulse count to wind speed every 2 seconds to reduce noise and CPU overhead.
  if (currentMillis - lastWindCalcTime >= 2000) {
    windSpeed = pulseCount * 0.5;
    pulseCount = 0;
    lastWindCalcTime = currentMillis;
  }

  // Convert recent bucket tips into rain rate (mm/h) over a 10-second window.
  if (currentMillis - lastRainRateCalcTime >= 10000) {
    unsigned long currentRainTips = rainTipCount;
    unsigned long elapsedMs = currentMillis - lastRainRateCalcTime;
    unsigned long deltaTips = currentRainTips - lastRainTipSnapshot;

    rainRateMmPerHour = (deltaTips * RAIN_MM_PER_TIP * 3600000.0f) / elapsedMs;
    lastRainTipSnapshot = currentRainTips;
    lastRainRateCalcTime = currentMillis;
  }

  String payload = buildPayload(temperature, humidity, pressure, rainPercent, windSpeed);

  // Throttle serial logging to keep the loop responsive.
  if (currentMillis - lastSerialPrintTime >= serialInterval) {
    lastSerialPrintTime = currentMillis;
    Serial.println(payload);
  }

  // Throttle BLE notifications to send a stable stream instead of flooding the client.
  if (currentMillis - lastBleNotifyTime >= bleNotifyInterval) {
    lastBleNotifyTime = currentMillis;
    notifyBleReading(payload);
  }

  // Put the OLED into low-power mode if the user has not interacted for 5 minutes.
  if (!displaySleeping && (currentMillis - lastUserInteractionTime >= displaySleepTimeout)) {
    sleepDisplay();
  }

  renderDisplay(temperature, humidity, rainPercent, windSpeed);
  // Short delay reduces CPU churn while keeping BLE and UI responsive enough for this design.
  delay(100);
}
