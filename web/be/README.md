# Backend

## Stack
- `Node.js`
- `Express`
- `MongoDB`
- `Mongoose`

## Mục tiêu
- Nhận dữ liệu từ `ESP32`
- Lưu dữ liệu thời tiết vào MongoDB
- Cung cấp API cho frontend
- Mở rộng sang auth, phân quyền, cảnh báo mail

## Cấu trúc
- `src/config`: cấu hình DB và app
- `src/controllers`: xử lý request
- `src/models`: schema mongoose
- `src/routes`: định nghĩa route
- `src/services`: business logic mở rộng sau
- `src/middlewares`: auth, validate, error handling

## API tạm thời
- `GET /health`
- `GET /api/readings`
- `POST /api/readings`
