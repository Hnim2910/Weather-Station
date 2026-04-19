# Weather Station

## Cấu hình các chân kết nối

```cpp
#define SDA_PIN 21
#define SCL_PIN 22
#define AHT20_ADDR 0x38
#define RAIN_AO 32
#define RAIN_DO 2
#define HALL_PIN 27

// OLED
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C
```

## Các module

- esp32
- màn hình oled 0.96 inch 128x96
- module cảm biến nhiệt độ, độ ẩm, áp suất không khí AHT20 + BMP280
- module cảm biến mưa SP0016
- module cảm biến từ HALL A3144 v1

## Todo

Tạo thiết bị đo các thông số môi trường xung quanh với các tính năng:

1. đo nhiệt độ, độ ẩm, đo lượng mưa, đo tốc độ gió và đưa ra màn hình:
- hiển thị 2 màn hình qua lại màn 1 nhiệt độ, độ ẩm, màn 2 lượng mưa, tốc độ gió

2. cho phép thiết bị pair với máy tính qua bluetooth trên giao diện web app (tham khảo hình thức pair giống kiểu các thiết bị mi band)

3. web dùng công nghệ nextjs và mongoose

Trang web cho phép người dùng tạo tài khoản, đăng nhập, sau khi đăng nhập sẽ cho phép pair với thiết bị này (có tính năng unpair để có thể kết nối với thiết bị mới), web có các chức năng chính:

- đọc tất cả dữ liệu mà thiết bị gửi về realtime
- lưu data vào database như mongodb
- có gửi cảnh báo về các thông số qua mail (tôi vẫn chưa biết là sẽ xử lý như nào khi tắt web đi mà nó có thể gửi được cảnh báo?)
- phân quyền: admin và user
- user có các chức năng như ở trên
- admin sẽ đọc được các data của (nhiều) thiết bị, thiết bị khi được pair sẽ được register là vị trí ở đâu để coi như là đại diện cho weather station của khu vực đó

## Experimental feature

- có thể nghiên cứu tạo thêm một thiết bị (hiện tại mới có 1 cái), để tạo phân tán khu vực, từ đó có thể cho vào một training model để có thể dự đoán thời tiết đơn giản?
- hiện tại mới có module cảm biến mưa chứ chưa đo được lượng mưa, có thể đề xuất tạo thêm một module dùng gàu nước để đo

## Cấu hình kết nối

- BLE chỉ dùng để pair/cấu hình ban đầu, không phải kênh truyền dữ liệu chính của thiết bị sau khi đã setup xong
- sau khi user đăng nhập trên web và chọn pair thiết bị, web sẽ kết nối với ESP32 qua BLE
- trên giao diện web, user sẽ tự nhập thông tin mạng WiFi gồm:
- tên mạng (SSID)
- mật khẩu mạng (password)
- tên thiết bị hoặc vị trí lắp đặt nếu cần
- web gửi các thông tin này cho ESP32 qua BLE
- ESP32 lưu cấu hình vào bộ nhớ và từ đó sẽ tự kết nối WiFi để gửi dữ liệu lên backend
- sau khi pair xong, việc xem dữ liệu trên web sẽ đi theo luồng:
- ESP32 -> WiFi -> backend -> database/realtime -> giao diện web
- BLE lúc này có thể ngắt kết nối mà thiết bị vẫn hoạt động bình thường nếu còn WiFi

## Xử lý khi đổi mạng hoặc mất kết nối

- trình duyệt/web không thể tự đọc sẵn mật khẩu WiFi mà máy tính đang dùng để gửi sang ESP32, nên user luôn phải tự nhập password khi cấu hình mạng cho thiết bị
- nếu thiết bị mất kết nối WiFi, ESP32 vẫn có thể tiếp tục đo cảm biến và hiển thị lên OLED, nhưng sẽ không gửi dữ liệu lên server cho tới khi có mạng lại
- ESP32 cần có cơ chế tự thử kết nối lại WiFi cũ
- nếu chuyển sang mạng mới, thiết bị sẽ không tự biết SSID/password mới chỉ vì còn đang kết nối BLE
- trong trường hợp đổi mạng, user cần mở lại giao diện pair/cấu hình và nhập SSID/password mới để gửi lại cho ESP32 qua BLE
- có thể bổ sung thêm chế độ reset mạng hoặc provisioning mode để cấu hình lại WiFi khi cần
