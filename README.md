# Local Weather Station

## Introduction
Local Weather Station is a smart weather monitoring system built with an ESP32 device, a Next.js web application, and a Node.js backend.  
The system allows users to connect to a weather station through BLE, view live sensor data, manage device settings, and receive alert notifications.  
It also provides a separate admin dashboard for monitoring users, devices, and district-based analytics.

## Main Features
- Pair an ESP32 weather station with a user account through BLE
- Display live sensor readings after device connection
- Show temperature, humidity, wind speed, pressure, and rain sensor wetness
- Store sensor data in MongoDB
- Send email alerts when readings exceed configured thresholds
- Allow users to rename devices and assign them to Hanoi districts
- Provide alert history and editable alert rules
- Support user and admin roles
- Provide district analytics on the admin dashboard by day, month, or year
- Allow admins to lock or unlock user accounts and force unpair devices

## Technology Stack
- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js, Express, Mongoose
- **Database**: MongoDB Atlas / MongoDB
- **Firmware**: ESP32 Arduino
- **Communication**: BLE Bridge between ESP32 and web frontend
- **Email**: Nodemailer with SMTP

## Hardware Modules
- ESP32
- 0.96 inch OLED display
- AHT20 temperature and humidity sensor
- BMP280 pressure sensor
- SP0016 rain sensor module
- A3144 Hall sensor module

## System Requirements
- Node.js 18 or later
- npm
- MongoDB connection string
- SMTP account for verification and alert emails
- Google Chrome or Microsoft Edge for Web Bluetooth
- ESP32 board package in Arduino IDE

## Hardware Pin Configuration
```cpp
#define SDA_PIN 21
#define SCL_PIN 22
#define AHT20_ADDR 0x38
#define RAIN_AO 32
#define RAIN_DO 2
#define HALL_PIN 27

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C
```

## Project Structure
```bash
weather/
├── weather.ino
├── web/
│   ├── be/
│   └── fe/
├── README.md
```

## Installation

### Backend
```bash
cd web/be
npm install
```

### Frontend
```bash
cd web/fe
npm install
```

## Running the Application

### Backend
```bash
cd web/be
npm run dev
```

### Frontend
```bash
cd web/fe
npm run dev
```

### Firmware
1. Open `weather.ino` in Arduino IDE
2. Select your ESP32 board
3. Use a partition scheme with enough app space (huge app)
4. Upload the firmware to the ESP32

## How the System Works

### User Flow
1. Register an account
2. Verify the account by email
3. Log in to the web application
4. Open the User Dashboard
5. Connect the ESP32 through BLE
6. Pair the device with the current account
7. Save the device name and district
8. View live sensor data and charts
9. Configure alert rules and thresholds

### Admin Flow
1. Log in with an admin account
2. Open the Admin Dashboard
3. Monitor users and devices
4. Lock or unlock user accounts
5. Force unpair devices if necessary
6. View district analytics by day, month, or year
7. Inspect the latest readings of online devices

## BLE Bridge Architecture
This project currently uses a BLE Bridge architecture:

```text
ESP32 -> BLE -> Frontend -> Backend -> MongoDB
```

## Notifications
The notification system sends email alerts when configured thresholds are exceeded.  
Users can:
- enable or disable each alert type
- change threshold values
- review alert history from the dashboard

Supported alert types:
- high temperature
- high humidity
- high wind speed
- high rain sensor wetness

## District Analytics
Each device can be assigned to a Hanoi district.  
The admin dashboard uses this information to analyze environmental data by district and by time range:
- day
- month
- year

## Password Recovery
The authentication system supports:
- email verification
- resend verification email
- forgot password
- reset password by email link

## Notes
- BLE connection is not persistent across page reloads
- after reloading the page, the user may need to reconnect BLE
- device ownership remains stored in the database even if BLE disconnects
- a device ID is generated automatically from the ESP32 MAC address
- users can rename the device without changing its technical device ID

## Future Expansion
In the next stage, the system can be expanded by deploying more weather station devices across multiple Hanoi districts. With a larger distributed dataset, the platform can evolve into a local environmental monitoring network and support short-term forecasting models, such as predicting weather conditions for the next hour based on historical sensor patterns.
