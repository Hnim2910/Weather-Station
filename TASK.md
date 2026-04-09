# TASK

## Mục tiêu nhóm
- Xây dựng hệ thống weather station gồm firmware `ESP32`, backend nhận dữ liệu, frontend quản lý thiết bị và dashboard realtime.
- Hoàn thành bản `MVP` trước, sau đó mới mở rộng cảnh báo mail, admin đa thiết bị và tính năng dự đoán.

## Chia việc nhóm 4 người

### Người 1: Firmware ESP32
- Chủ sở hữu: `weather.ino`
- Nhiệm vụ:
- Đọc dữ liệu từ `AHT20/BMP280`, cảm biến mưa, Hall sensor.
- Tính toán tốc độ gió từ số xung Hall.
- Hiển thị OLED 2 màn hình luân phiên.
- Tạo chế độ `BLE provisioning` để nhận `SSID`, `password`, `deviceName`, `location`.
- Kết nối `Wi-Fi` và gửi dữ liệu lên backend.
- Xử lý reconnect khi mất mạng.
- Deliverable:
- Firmware đọc cảm biến ổn định.
- Gửi được JSON mẫu lên API backend.
- Có tài liệu mô tả format payload gửi lên server.

### Người 2: Backend và Database
- Chủ sở hữu: `web/be`
- Nhiệm vụ:
- Dựng server `Node.js/Express`.
- Kết nối `MongoDB` bằng `Mongoose`.
- Thiết kế schema `User`, `Device`, `WeatherReading`.
- Làm API auth cơ bản.
- Làm API nhận dữ liệu từ thiết bị.
- Làm API trả dữ liệu dashboard theo `deviceId`.
- Chuẩn bị logic cảnh báo mail theo ngưỡng.
- Deliverable:
- API chạy được local.
- Lưu được dữ liệu thiết bị vào MongoDB.
- Có tài liệu API ngắn cho frontend và firmware.

### Người 3: Frontend
- Chủ sở hữu: `web/fe`
- Nhiệm vụ:
- Dựng giao diện bằng `Next.js`.
- Làm trang đăng ký, đăng nhập.
- Làm dashboard hiển thị dữ liệu thời tiết.
- Làm màn pair thiết bị qua `BLE`.
- Làm giao diện danh sách thiết bị, pair/unpair.
- Gọi API backend để lấy dữ liệu và hiển thị realtime.
- Deliverable:
- Có flow UI cơ bản từ login đến dashboard.
- Có màn cấu hình thiết bị để nhập `SSID/password`.
- Kết nối được với API backend.

### Người 4: Tích hợp, kiểm thử, tài liệu
- Chủ sở hữu: tích hợp toàn hệ thống và tài liệu repo
- Nhiệm vụ:
- Kiểm thử luồng end-to-end từ `ESP32 -> backend -> frontend`.
- Chuẩn hóa payload, response API, mã lỗi.
- Viết `README`, sơ đồ hệ thống, hướng dẫn chạy local.
- Quản lý tiến độ, test case, demo script.
- Hỗ trợ các thành viên khác khi có phần bị nghẽn.
- Deliverable:
- Có checklist test theo từng luồng.
- Có tài liệu demo và hướng dẫn chạy dự án.
- Có báo cáo lỗi tích hợp và cách xử lý.

## Mốc triển khai đề xuất

### Giai đoạn 1: Chốt hợp đồng dữ liệu
- Chốt payload từ thiết bị gửi lên backend.
- Chốt schema dữ liệu MongoDB.
- Chốt danh sách API tối thiểu.

### Giai đoạn 2: Làm MVP độc lập
- Firmware đọc cảm biến và in Serial.
- Backend nhận POST reading và lưu DB.
- Frontend hiển thị dashboard với dữ liệu mẫu hoặc dữ liệu thật.

### Giai đoạn 3: Pair và đồng bộ thật
- Frontend pair `BLE`.
- Firmware nhận cấu hình Wi-Fi.
- Thiết bị gửi dữ liệu thật lên backend.

### Giai đoạn 4: Hoàn thiện
- Realtime update.
- Cảnh báo mail.
- Phân quyền admin/user.
- Viết tài liệu và chuẩn bị demo.

## Nguyên tắc làm việc
- Mỗi người tự quản file thuộc ownership của mình.
- Không sửa tràn sang module người khác nếu chưa thống nhất.
- Mọi thay đổi format payload hoặc API phải được thông báo cho cả nhóm.
- Chỉ ghép hệ thống sau khi từng phần có bản chạy tối thiểu.

## API/Payload cần chốt sớm
- `POST /api/readings`
- `GET /api/devices/:deviceId/readings`
- `POST /api/auth/register`
- `POST /api/auth/login`
- payload mẫu:

```json
{
  "deviceId": "ws-001",
  "temperature": 31.2,
  "humidity": 74.5,
  "pressure": 1006.8,
  "rainDigital": 1,
  "rainAnalog": 520,
  "windSpeed": 3.4,
  "timestamp": "2026-04-09T00:00:00Z"
}
```
