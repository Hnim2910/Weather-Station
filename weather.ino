#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_BMP280.h>

// Định nghĩa cấu hình chân theo README.md
#define SDA_PIN 21
#define SCL_PIN 22
#define AHT20_ADDR 0x38
#define RAIN_AO 32
#define RAIN_DO 2
#define HALL_PIN 27

// Cấu hình OLED
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C

// Khởi tạo các đối tượng
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
Adafruit_AHTX0 aht;
Adafruit_BMP280 bmp; 

// Biến điều khiển màn hình
unsigned long previousMillis = 0;
const long screenInterval = 5000; // Đổi màn hình mỗi 5 giây
int screenState = 0; // 0: Nhiệt độ & Độ ẩm, 1: Lượng mưa & Tốc độ gió

// Biến cho cảm biến Hall (đo tốc độ gió)
volatile int pulseCount = 0;
unsigned long lastWindCalcTime = 0;
float windSpeed = 0.0;

// Hàm ngắt (Interrupt) đếm xung từ cảm biến từ
void IRAM_ATTR countPulse() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN); // Khởi tạo I2C với chân custom

  // 1. Khởi tạo OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println(F("Khong tim thay OLED SSD1306"));
  } else {
    display.clearDisplay();
    display.setTextColor(WHITE);
    display.setTextSize(1);
    display.setCursor(0, 10);
    display.println("Weather Station...");
    display.display();
  }

  // 2. Khởi tạo Cảm biến AHT20 & BMP280
  if (!aht.begin(&Wire, 0, AHT20_ADDR)) {
    Serial.println("Khong tim thay AHT20!");
  }
  if (!bmp.begin(0x76)) { // Địa chỉ I2C BMP280 thường là 0x76 hoặc 0x77
    Serial.println("Khong tim thay BMP280!");
  }

  // 3. Khởi tạo Cảm biến mưa & Hall
  pinMode(RAIN_AO, INPUT);
  pinMode(RAIN_DO, INPUT);
  pinMode(HALL_PIN, INPUT_PULLUP);
  
  // Đăng ký ngắt cho chân Hall (kích hoạt khi nam châm đi qua làm chân tín hiệu kéo xuống LOW)
  attachInterrupt(digitalPinToInterrupt(HALL_PIN), countPulse, FALLING);
  
  delay(2000); // Dừng 2s để đọc chữ Init
}

void loop() {
  unsigned long currentMillis = millis();

  // ==========================================
  // ĐỌC DỮ LIỆU TỪ CÁC CẢM BIẾN
  // ==========================================
  
  // 1. Nhiệt độ và Độ ẩm (AHT20)
  sensors_event_t humidity, temp;
  aht.getEvent(&humidity, &temp);
  float temperature = temp.temperature;
  float hum = humidity.relative_humidity;

  // (Lưu ý: BMP280 cũng đo được nhiệt độ và thêm Áp suất, bạn có thể gọi bmp.readPressure() nếu muốn dùng)

  // 2. Lượng mưa (Cảm biến mưa Analog)
  // ADC ESP32 là 12-bit (0-4095). Ướt = 0, Khô = 4095. Đảo ngược lại thành phần trăm (0-100%)
  int rainRaw = analogRead(RAIN_AO);
  float rainPercentage = map(rainRaw, 4095, 0, 0, 100); 
  if (rainPercentage < 0) rainPercentage = 0;
  if (rainPercentage > 100) rainPercentage = 100;

  // 3. Tốc độ gió (Hall Sensor) - Cập nhật mỗi 2 giây
  if (currentMillis - lastWindCalcTime >= 2000) {
    // TÍNH TOÁN TỐC ĐỘ GIÓ Ở ĐÂY
    // Tạm thời công thức mẫu: mỗi xung giả định là 0.5 m/s (Bạn sẽ cần hiệu chỉnh lại dựa trên đường kính cánh quạt)
    windSpeed = pulseCount * 0.5; 
    
    pulseCount = 0; // Reset bộ đếm cho chu kỳ tiếp theo
    lastWindCalcTime = currentMillis;
  }

  // ==========================================
  // LOGIC HIỂN THỊ OLED
  // ==========================================
  
  // Kiểm tra xem đã đến lúc đổi màn hình chưa
  if (currentMillis - previousMillis >= screenInterval) {
    previousMillis = currentMillis;
    screenState = !screenState; // Lật trạng thái giữa 0 và 1
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
    display.print(hum, 1);
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

    // Lượng mưa (hiển thị % độ ẩm ướt của module)
    display.setCursor(0, 45);
    display.print("R:");
    display.print(rainPercentage, 0);
    display.print(" %");
  }

  display.display();
  
  // Delay nhỏ để tránh ESP32 chạy quá tải, nhưng không đủ lớn để làm nghẽn quá trình ngắt (Interrupt)
  delay(100); 
}

/* Địa chỉ I2C của BMP280: Trong code đang để mặc định thử nghiệm là 0x76. Nếu ESP32 báo lỗi "Khong tim thay BMP280", đổi số đó thành 0x77 (tuỳ thuộc nhà sản xuất module).

Công thức đo tốc độ gió: Trong code hiện tại, biến windSpeed = pulseCount * 0.5; chỉ là code giữ chỗ (placeholder). Khi lắp ráp phần cứng cánh quạt 3 cánh xong, sẽ cần đo chu vi quỹ đạo của nam châm rồi tính quãng đường đi được trong 1 giây để ra được công thức m/s chuẩn nhất.

Cảm biến mưa: Hiện tại module SP0016 chỉ đo được độ "ướt" của bề mặt (từ 0 đến 100%). Như đã viết trong README, nếu muốn đo "lượng mưa" (mm) chuẩn xác thì phải thiết kế module dạng (tipping bucket) ở Phase 2. */