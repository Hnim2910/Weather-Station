#include <Wire.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

//Pin
#define SDA_PIN 21
#define SCL_PIN 22
#define AHT20_ADDR 0x38
#define RAIN_AO 32
#define RAIN_DO 2
#define HALL_PIN 27

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

BLEServer* bleServer = nullptr;
BLECharacteristic* bridgeInfoCharacteristic = nullptr;
BLECharacteristic* bridgeReadingCharacteristic = nullptr;
BLECharacteristic* bridgeStatusCharacteristic = nullptr;

String deviceId;

bool bmpReady = false;
bool bleClientConnected = false;
bool bleBridgeStreamingEnabled = true;

unsigned long previousMillis = 0;
const long screenInterval = 5000;
int screenState = 0;

unsigned long lastSerialPrintTime = 0;
const long serialInterval = 2000;
unsigned long lastBleNotifyTime = 0;
const long bleNotifyInterval = 2000;

volatile int pulseCount = 0;
unsigned long lastWindCalcTime = 0;
float windSpeed = 0.0;

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
    bleClientConnected = true;
    updateBridgeStatus(bleBridgeStreamingEnabled ? "STREAMING" : "STOPPED");
  }

  void onDisconnect(BLEServer* server) override {
    bleClientConnected = false;
    updateBridgeStatus("CLIENT_DISCONNECTED");
    BLEDevice::startAdvertising();
  }
};

class BridgeControlCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
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
  payload += "}";

  return payload;
}

void notifyBleReading(const String& payload) {
  if (!bleBridgeStreamingEnabled || bridgeReadingCharacteristic == nullptr) {
    return;
  }

  bridgeReadingCharacteristic->setValue(payload.c_str());
  if (bleClientConnected) {
    bridgeReadingCharacteristic->notify();
  }
}

void scanI2CDevices() {
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
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  deviceId = buildDeviceId();
  Serial.print("Device ID: ");
  Serial.println(deviceId);

  startBleServices();

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println(F("Khong tim thay OLED SSD1306"));
  } else {
    display.clearDisplay();
    display.setTextColor(WHITE);
    display.setTextSize(1);
    display.setCursor(0, 10);
    display.println("Weather Station...");
    display.display();
  }

  if (!aht.begin(&Wire, 0, AHT20_ADDR)) {
    Serial.println("Khong tim thay AHT20!");
  }

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
  pinMode(HALL_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(HALL_PIN), countPulse, FALLING);

  delay(2000);
}

void loop() {
  unsigned long currentMillis = millis();

  sensors_event_t humidityEvent;
  sensors_event_t temperatureEvent;
  aht.getEvent(&humidityEvent, &temperatureEvent);

  float temperature = temperatureEvent.temperature;
  float humidity = humidityEvent.relative_humidity;

  float pressure = NAN;
  if (bmpReady) {
    pressure = bmp.readPressure() / 100.0;
  }

  int rainRaw = analogRead(RAIN_AO);
  float rainPercent = map(rainRaw, 4095, 0, 0, 100);
  if (rainPercent < 0) {
    rainPercent = 0;
  }
  if (rainPercent > 100) {
    rainPercent = 100;
  }

  if (currentMillis - lastWindCalcTime >= 2000) {
    windSpeed = pulseCount * 0.5;
    pulseCount = 0;
    lastWindCalcTime = currentMillis;
  }

  String payload = buildPayload(temperature, humidity, pressure, rainPercent, windSpeed);

  if (currentMillis - lastSerialPrintTime >= serialInterval) {
    lastSerialPrintTime = currentMillis;
    Serial.println(payload);
  }

  if (currentMillis - lastBleNotifyTime >= bleNotifyInterval) {
    lastBleNotifyTime = currentMillis;
    notifyBleReading(payload);
  }

  // ==========================================
  // LOGIC HIỂN THỊ OLED
  // ==========================================
  
  // Kiểm tra xem đã đến lúc đổi màn hình chưa
  if (currentMillis - previousMillis >= screenInterval) {
    previousMillis = currentMillis;
    screenState = !screenState;
  }

  display.clearDisplay();

  if (screenState == 0) {
    // --- MÀN HÌNH 1: NHIỆT ĐỘ & ĐỘ ẨM ---
    display.setTextSize(1);
    display.setCursor(20, 0);
    display.print("TEMP & HUMIDITY");

    display.setTextSize(2);
    // Nhiệt độ
    display.setCursor(0, 20);
    display.print("T:");
    display.print(temperature, 1);
    display.print(" C");

    // Độ ẩm
    display.setCursor(0, 45);
    display.print("H:");
    display.print(humidity, 1);
    display.print(" %");
  } else {
    // --- MÀN HÌNH 2: MƯA & TỐC ĐỘ GIÓ ---
    display.setTextSize(1);
    display.setCursor(25, 0);
    display.print("RAIN & WIND");

    display.setTextSize(2);
    // Tốc độ gió
    display.setCursor(0, 20);
    display.print("W:");
    display.print(windSpeed, 1);
    display.print(" m/s");

    // Độ ướt
    display.setCursor(0, 45);
    display.print("RAIN : ");
    display.print(rainPercent, 0);
    display.print("%");
  }

  display.display();
  delay(100);
}
