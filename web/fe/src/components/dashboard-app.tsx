"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Responsive, WidthProvider, type Layouts } from "react-grid-layout/legacy";
import {
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  RefreshCw,
  Bluetooth,
  LogOut,
  Bell,
  Settings2,
  X
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { AuthCard } from "./auth-card";
import { MetricChart } from "./metric-chart";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const DEFAULT_DEVICE_ID = "ws-001";
const TOKEN_STORAGE_KEY = "weather-auth-token";
const USER_STORAGE_KEY = "weather-auth-user";
const BLE_DEVICE_NAME = "WS-Bridge";
const BLE_SERVICE_UUID = "6c123450-52d1-4f36-8a87-2d7e4f510101";
const BLE_INFO_UUID = "6c123450-52d1-4f36-8a87-2d7e4f510102";
const BLE_READING_UUID = "6c123450-52d1-4f36-8a87-2d7e4f510103";
const BLE_CONTROL_UUID = "6c123450-52d1-4f36-8a87-2d7e4f510104";
const BLE_STATUS_UUID = "6c123450-52d1-4f36-8a87-2d7e4f510105";
const DASHBOARD_LAYOUT_STORAGE_KEY = "weather-dashboard-grid-layouts-v1";
const ResponsiveGridLayout = WidthProvider(Responsive);

const DEFAULT_DASHBOARD_LAYOUTS: Layouts = {
  lg: [
    { i: "temperature", x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "humidity", x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "wind", x: 6, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "rain", x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "temperatureTrend", x: 0, y: 4, w: 12, h: 8, minW: 6, minH: 5 },
    { i: "humidityTrend", x: 0, y: 12, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "windTrend", x: 4, y: 12, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "wetnessTrend", x: 8, y: 12, w: 4, h: 6, minW: 3, minH: 4 }
  ],
  md: [
    { i: "temperature", x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "humidity", x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "wind", x: 6, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "rain", x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: "temperatureTrend", x: 0, y: 4, w: 12, h: 8, minW: 6, minH: 5 },
    { i: "humidityTrend", x: 0, y: 12, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "windTrend", x: 4, y: 12, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "wetnessTrend", x: 8, y: 12, w: 4, h: 6, minW: 3, minH: 4 }
  ],
  sm: [
    { i: "temperature", x: 0, y: 0, w: 2, h: 4, minW: 1, minH: 3 },
    { i: "humidity", x: 0, y: 4, w: 2, h: 4, minW: 1, minH: 3 },
    { i: "wind", x: 0, y: 8, w: 2, h: 4, minW: 1, minH: 3 },
    { i: "rain", x: 0, y: 12, w: 2, h: 4, minW: 1, minH: 3 },
    { i: "temperatureTrend", x: 0, y: 16, w: 2, h: 8, minW: 2, minH: 5 },
    { i: "humidityTrend", x: 0, y: 24, w: 2, h: 6, minW: 2, minH: 4 },
    { i: "windTrend", x: 0, y: 30, w: 2, h: 6, minW: 2, minH: 4 },
    { i: "wetnessTrend", x: 0, y: 36, w: 2, h: 6, minW: 2, minH: 4 }
  ]
};

function getHomePathForRole(role?: "admin" | "user") {
  return role === "admin" ? "/admin" : "/user";
}

type WeatherReading = {
  _id?: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  rain: number;
  windSpeed: number;
  timestamp?: string;
};

type ReadingsResponse = {
  count: number;
  data: WeatherReading[];
};

type AuthUser = {
  id: string;
  name?: string;
  email: string;
  role: "admin" | "user";
};

type AuthResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

type AuthMode = "login" | "register";
type DashboardPageKind = "login" | "user";

type DeviceOwner = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: "admin" | "user";
};

type DeviceRecord = {
  _id?: string;
  deviceId: string;
  owner: DeviceOwner | null;
  pairedAt?: string | null;
  lastSeenAt?: string | null;
};

type DevicesResponse = {
  count: number;
  data: DeviceRecord[];
};

type AlertRule = {
  key: "temperatureHigh" | "windHigh" | "humidityHigh" | "rainHigh";
  label: string;
  comparator: string;
  unit: string;
};

type AlertSettings = {
  temperatureHigh: boolean;
  windHigh: boolean;
  humidityHigh: boolean;
  rainHigh: boolean;
};

type AlertThresholds = {
  temperatureHigh: number;
  windHigh: number;
  humidityHigh: number;
  rainHigh: number;
};

type AlertHistoryEntry = {
  key: string;
  label: string;
  rule: string;
  value: string;
  sentAt: string;
};

type DeviceAlertsResponse = {
  deviceId: string;
  rules: AlertRule[];
  settings: AlertSettings;
  thresholds: AlertThresholds;
  history: AlertHistoryEntry[];
};

function formatTimeLabel(timestamp?: string) {
  if (!timestamp) {
    return "--:--";
  }

  const date = new Date(timestamp);
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildChartData(readings: WeatherReading[]) {
  return [...readings]
    .reverse()
    .map((reading) => ({
      time: formatTimeLabel(reading.timestamp),
      temperature: reading.temperature,
      humidity: reading.humidity,
      pressure: reading.pressure,
      windSpeed: reading.windSpeed,
      rain: reading.rain
    }));
}

function getStoredUser() {
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}
export default function DashboardApp({
  pageKind
}: {
  pageKind: DashboardPageKind;
}) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [claimStatus, setClaimStatus] = useState("");
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceActionLoading, setDeviceActionLoading] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(DEFAULT_DEVICE_ID);
  const [readings, setReadings] = useState<WeatherReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [bleStatus, setBleStatus] = useState("BLE not connected");
  const [bleBusy, setBleBusy] = useState(false);
  const [bleDeviceId, setBleDeviceId] = useState("");
  const [bleConnected, setBleConnected] = useState(false);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);
  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryEntry[]>([]);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertSavingKey, setAlertSavingKey] = useState<string>("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [dashboardLayouts, setDashboardLayouts] = useState<Layouts>(DEFAULT_DASHBOARD_LAYOUTS);
  const bleDeviceRef = React.useRef<BluetoothDevice | null>(null);
  const bleReadingCharacteristicRef =
    React.useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const bleControlCharacteristicRef =
    React.useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const bleNotificationHandlerRef = React.useRef<((event: Event) => void) | null>(null);
  const bleDisconnectHandlerRef = React.useRef<((event: Event) => void) | null>(null);

  useEffect(() => {
    window.localStorage.removeItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    setDashboardLayouts(DEFAULT_DASHBOARD_LAYOUTS);
  }, []);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    const storedUser = getStoredUser();
    const url = new URL(window.location.href);
    const verifyToken = url.searchParams.get("token");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setCurrentUser(storedUser);
    } else {
      setLoading(false);
    }

    if (verifyToken) {
      verifyEmailToken(verifyToken);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !token) {
      if (!loading && pageKind !== "login") {
        router.replace("/login");
      }
      return;
    }

    const targetPath = getHomePathForRole(currentUser.role);

    if (pageKind === "login") {
      router.replace(targetPath);
      return;
    }

    if (pageKind === "user" && currentUser.role === "admin") {
      router.replace("/admin");
    }
  }, [currentUser, loading, pageKind, router, token]);

  useEffect(() => {
    if (!token) {
      setReadings([]);
      return;
    }

    fetchDevices(token);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedDeviceId) {
      return;
    }

    fetchReadings(true, token, selectedDeviceId);
    void fetchDeviceAlerts(token, selectedDeviceId);

    const intervalId = window.setInterval(() => {
      fetchReadings(false, token, selectedDeviceId);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [token, selectedDeviceId]);

  useEffect(() => {
    return () => {
      void disconnectBleSession({
        clearKnownDevice: true,
        clearDeviceId: true,
        statusMessage: ""
      });
    };
  }, []);

  useEffect(() => {
    if (!claimStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setClaimStatus("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [claimStatus]);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify(dashboardLayouts)
    );
  }, [dashboardLayouts]);

  async function authRequest(endpoint: string, payload: object) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Authentication failed");
    }

    return result as AuthResponse;
  }

  async function claimDevice(authToken: string, deviceId = selectedDeviceId) {
    const response = await fetch(`${API_BASE_URL}/api/devices/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        deviceId
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Khong the claim thiet bi");
    }

    setClaimStatus(`Device ${deviceId} paired successfully.`);
  }

  async function unclaimDevice(authToken: string, deviceId: string) {
    const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/unclaim`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Khong the unpair thiet bi");
    }

    setClaimStatus(`Device ${deviceId} unpaired successfully.`);
  }

  async function handleAuthSubmit(payload: {
    name: string;
    email: string;
    password: string;
  }) {
    setAuthLoading(true);
    setAuthError("");
    setAuthInfo("");

    try {
      const endpoint =
        authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const result = await authRequest(endpoint, payload);

      if (authMode === "register") {
        setAuthInfo(
          "Dang ky thanh cong. Hay kiem tra email de xac thuc tai khoan truoc khi dang nhap."
        );
        setPendingVerificationEmail(payload.email);
        setAuthMode("login");
        return;
      }

      window.localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));

      setToken(result.token);
      setCurrentUser(result.user);
      setPendingVerificationEmail("");
      await fetchDevices(result.token);
      router.replace(getHomePathForRole(result.user.role));
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Auth failed";
      setAuthError(message);

      if (message === "Email is not verified") {
        setPendingVerificationEmail(payload.email);
        setAuthInfo("Tai khoan chua xac thuc. Ban can xac thuc email truoc khi dang nhap.");
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function verifyEmailToken(verifyToken: string) {
    setAuthInfo("Dang xac thuc email...");
    setAuthError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Khong the xac thuc email");
      }

      setAuthInfo("Xac thuc email thanh cong. Ban co the dang nhap.");
      setAuthMode("login");
    } catch (verifyError) {
      const message =
        verifyError instanceof Error
          ? verifyError.message
          : "Khong the xac thuc email";
      setAuthError(message);
    }
  }

  async function resendVerification(email: string) {
    setResendLoading(true);
    setAuthError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Khong the gui lai email xac thuc");
      }

      setAuthInfo("Da gui lai email xac thuc. Hay kiem tra hop thu cua ban.");
    } catch (resendError) {
      const message =
        resendError instanceof Error
          ? resendError.message
          : "Khong the gui lai email xac thuc";
      setAuthError(message);
    } finally {
      setResendLoading(false);
    }
  }

  async function fetchReadings(
    showLoadingState = false,
    authToken = token,
    deviceId = selectedDeviceId
  ) {
    if (!authToken || !deviceId) {
      setLoading(false);
      return;
    }

    if (showLoadingState) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/readings?deviceId=${deviceId}&limit=12`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Backend responded with ${response.status}`);
      }

      const typedResult = result as ReadingsResponse;
      setReadings(typedResult.data);
      setError("");
      setLastUpdated(new Date().toLocaleString("vi-VN"));
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Khong the tai du lieu tu backend";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchDevices(authToken = token) {
    if (!authToken) {
      return;
    }

    setDeviceLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/devices`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        cache: "no-store"
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Khong the tai danh sach thiet bi");
      }

      const typedResult = result as DevicesResponse;
      setDevices(typedResult.data);

      if (typedResult.data.length > 0) {
        const currentExists = typedResult.data.some(
          (device) => device.deviceId === selectedDeviceId
        );
        if (!currentExists) {
          setSelectedDeviceId(typedResult.data[0].deviceId);
        }
      } else {
        setSelectedDeviceId(DEFAULT_DEVICE_ID);
      }
    } catch (fetchDevicesError) {
      const message =
        fetchDevicesError instanceof Error
          ? fetchDevicesError.message
          : "Khong the tai danh sach thiet bi";
      setError(message);
    } finally {
      setDeviceLoading(false);
      setLoading(false);
    }
  }

  async function fetchDeviceAlerts(authToken = token, deviceId = selectedDeviceId) {
    if (!authToken || !deviceId) {
      setAlertRules([]);
      setAlertSettings(null);
      setAlertThresholds(null);
      setAlertHistory([]);
      return;
    }

    setAlertLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/alerts`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        cache: "no-store"
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Khong the tai cau hinh canh bao");
      }

      const typedResult = result as DeviceAlertsResponse;
      setAlertRules(typedResult.rules || []);
      setAlertSettings(typedResult.settings || null);
      setAlertThresholds(typedResult.thresholds || null);
      setAlertHistory(typedResult.history || []);
    } catch (alertError) {
      const message =
        alertError instanceof Error
          ? alertError.message
          : "Khong the tai cau hinh canh bao";
      setError(message);
    } finally {
      setAlertLoading(false);
    }
  }

  async function updateAlertRule(
    key: keyof AlertSettings,
    payload: {
      enabled?: boolean;
      threshold?: number;
    }
  ) {
    if (!token || !selectedDeviceId || !alertSettings || !alertThresholds) {
      return;
    }

    setAlertSavingKey(key);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/devices/${selectedDeviceId}/alerts`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...(typeof payload.enabled === "boolean" ? { [key]: payload.enabled } : {}),
          ...(typeof payload.threshold === "number"
            ? { [`${key}Threshold`]: payload.threshold }
            : {})
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Khong the cap nhat canh bao");
      }

      const typedResult = result as DeviceAlertsResponse;
      setAlertRules(typedResult.rules || []);
      setAlertSettings(typedResult.settings || null);
      setAlertThresholds(typedResult.thresholds || null);
      setAlertHistory(typedResult.history || []);
    } catch (toggleError) {
      const message =
        toggleError instanceof Error
          ? toggleError.message
          : "Khong the cap nhat canh bao";
      setError(message);
    } finally {
      setAlertSavingKey("");
    }
  }

  function buildRuleText(rule: AlertRule) {
    if (!alertThresholds) {
      return `${rule.comparator} -- ${rule.unit}`;
    }

    return `${rule.comparator} ${alertThresholds[rule.key]} ${rule.unit}`;
  }

  function toggleNotificationPanel() {
    setIsNotificationOpen((previous) => {
      const next = !previous;

      if (next && token && selectedDeviceId) {
        void fetchDeviceAlerts(token, selectedDeviceId);
      }

      return next;
    });
  }

  function openRuleModal() {
    setIsNotificationOpen(false);
    setIsRuleModalOpen(true);
  }

  function closeRuleModal() {
    setIsRuleModalOpen(false);
  }

  async function disconnectBleSession({
    clearKnownDevice = false,
    clearDeviceId = false,
    statusMessage = "BLE not connected"
  }: {
    clearKnownDevice?: boolean;
    clearDeviceId?: boolean;
    statusMessage?: string;
  } = {}) {
    const readingCharacteristic = bleReadingCharacteristicRef.current;
    const controlCharacteristic = bleControlCharacteristicRef.current;
    const device = bleDeviceRef.current;
    const notificationHandler = bleNotificationHandlerRef.current;
    const disconnectHandler = bleDisconnectHandlerRef.current;

    try {
      if (controlCharacteristic) {
        const encoder = new TextEncoder();
        await controlCharacteristic.writeValue(encoder.encode("STOP"));
      }
    } catch {}

    try {
      if (readingCharacteristic && notificationHandler) {
        readingCharacteristic.removeEventListener(
          "characteristicvaluechanged",
          notificationHandler
        );
      }
    } catch {}

    try {
      if (readingCharacteristic) {
        await readingCharacteristic.stopNotifications();
      }
    } catch {}

    try {
      if (device && disconnectHandler) {
        device.removeEventListener("gattserverdisconnected", disconnectHandler);
      }
    } catch {}

    try {
      if (device?.gatt?.connected) {
        device.gatt.disconnect();
      }
    } catch {}

    bleReadingCharacteristicRef.current = null;
    bleControlCharacteristicRef.current = null;
    bleNotificationHandlerRef.current = null;
    bleDisconnectHandlerRef.current = null;

    if (clearKnownDevice) {
      bleDeviceRef.current = null;
    }

    if (clearDeviceId) {
      setBleDeviceId("");
    }

    setBleConnected(false);
    setBleStatus(statusMessage);
  }

  async function handleUnpairSelectedDevice() {
    if (!token || !selectedDeviceId) {
      return;
    }

    setDeviceActionLoading(true);
    setError("");

    try {
      await disconnectBleSession({
        clearKnownDevice: true,
        clearDeviceId: true,
        statusMessage: "BLE disconnected"
      });
      await unclaimDevice(token, selectedDeviceId);
      setReadings([]);
      await fetchDevices(token);
    } catch (deviceError) {
      const message =
        deviceError instanceof Error ? deviceError.message : "Khong the unpair thiet bi";
      setError(message);
    } finally {
      setDeviceActionLoading(false);
    }
  }

  function handleLogout() {
    void disconnectBleSession({
      clearKnownDevice: true,
      clearDeviceId: true,
      statusMessage: "BLE disconnected"
    });
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    setToken("");
    setCurrentUser(null);
    setReadings([]);
    setDevices([]);
    setError("");
    setClaimStatus("");
    setAuthInfo("");
    setAuthError("");
    setLoading(false);
  }

  async function forwardReadingToBackend(
    authToken: string,
    reading: WeatherReading
  ) {
    const response = await fetch(`${API_BASE_URL}/api/readings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(reading)
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.message || "Khong the day reading len backend");
    }
  }

  async function connectBleBridge(reuseKnownDevice = false) {
    if (!("bluetooth" in navigator)) {
      setBleStatus("This browser does not support Web Bluetooth");
      return;
    }

    setBleBusy(true);
    setBleStatus(
      reuseKnownDevice && bleDeviceRef.current
        ? "Reconnecting BLE..."
        : "Searching for BLE device..."
    );

    try {
      await disconnectBleSession({
        clearKnownDevice: false,
        clearDeviceId: false,
        statusMessage: ""
      });

      const device =
        reuseKnownDevice && bleDeviceRef.current
          ? bleDeviceRef.current
          : await navigator.bluetooth.requestDevice({
              filters: [{ name: BLE_DEVICE_NAME }],
              optionalServices: [BLE_SERVICE_UUID]
            });

      bleDeviceRef.current = device;

      setBleStatus("Connecting to GATT...");
      const server = await device.gatt?.connect();

      if (!server) {
        throw new Error("Failed to connect to the GATT server");
      }

      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const decoder = new TextDecoder();

      try {
        const infoCharacteristic = await service.getCharacteristic(BLE_INFO_UUID);
        const infoValue = await infoCharacteristic.readValue();
        const infoText = decoder.decode(infoValue);
        const info = JSON.parse(infoText) as { deviceId?: string };
        if (info.deviceId) {
          setBleDeviceId(info.deviceId);
          setSelectedDeviceId(info.deviceId);
        }
      } catch {
        setBleDeviceId("");
      }

      const statusCharacteristic = await service.getCharacteristic(BLE_STATUS_UUID);
      const readingCharacteristic = await service.getCharacteristic(BLE_READING_UUID);
      const controlCharacteristic = await service.getCharacteristic(BLE_CONTROL_UUID);
      bleReadingCharacteristicRef.current = readingCharacteristic;
      bleControlCharacteristicRef.current = controlCharacteristic;

      await readingCharacteristic.startNotifications();

      const notificationHandler = async (event: Event) => {
        try {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          const value = target.value;
          if (!value) {
            return;
          }

          const readingText = decoder.decode(value);
          const reading = JSON.parse(readingText) as WeatherReading;
          setReadings((previous) => {
            const next = [
              {
                ...reading,
                timestamp: new Date().toISOString()
              },
              ...previous
            ].slice(0, 12);
            return next;
          });
          setLastUpdated(new Date().toLocaleString("vi-VN"));

          if (token) {
            await forwardReadingToBackend(token, reading);
          }
        } catch (notifyError) {
          const message =
            notifyError instanceof Error
              ? notifyError.message
              : "Khong the xu ly reading BLE";
          setBleStatus(`BLE error: ${message}`);
        }
      };

      bleNotificationHandlerRef.current = notificationHandler;
      readingCharacteristic.addEventListener(
        "characteristicvaluechanged",
        notificationHandler
      );

      const disconnectHandler = () => {
        bleReadingCharacteristicRef.current = null;
        bleControlCharacteristicRef.current = null;
        bleNotificationHandlerRef.current = null;
        bleDisconnectHandlerRef.current = null;
        setBleConnected(false);
        setBleStatus("BLE disconnected. Press Reconnect to connect again.");
      };

      bleDisconnectHandlerRef.current = disconnectHandler;
      device.addEventListener("gattserverdisconnected", disconnectHandler);

      const encoder = new TextEncoder();
      await controlCharacteristic.writeValue(encoder.encode("START"));
      setBleConnected(true);

      try {
        const statusValue = await statusCharacteristic.readValue();
        const statusText = decoder.decode(statusValue);
        setBleStatus(
          `Paired ${device.name || BLE_DEVICE_NAME}. STATUS: ${statusText || "STREAMING"}`
        );
      } catch {
        setBleStatus(`Paired ${device.name || BLE_DEVICE_NAME}`);
      }
    } catch (bleError) {
      const message =
        bleError instanceof Error ? bleError.message : "Loi BLE khong xac dinh";
      setBleConnected(false);
      setBleStatus(`BLE error: ${message}`);
    } finally {
      setBleBusy(false);
    }
  }

  async function handlePairDeviceFlow() {
    if (!token || !selectedDeviceId) {
      return;
    }

    setDeviceActionLoading(true);
    setError("");

    try {
      await claimDevice(token, selectedDeviceId);
      await fetchDevices(token);
      await connectBleBridge();
    } catch (pairError) {
      const message =
        pairError instanceof Error ? pairError.message : "Khong the pair thiet bi";
      setError(message);
    } finally {
      setDeviceActionLoading(false);
    }
  }

  async function handleReconnectBle() {
    if (!bleDeviceRef.current) {
      setBleStatus("No paired BLE device is available for reconnect");
      return;
    }

    setError("");
    await connectBleBridge(true);
  }

  const latestReading = readings[0];
  const chartData = buildChartData(readings);
  const selectedDevice = devices.find((device) => device.deviceId === selectedDeviceId) || null;
  const isSelectedDeviceOwned = Boolean(selectedDevice?.owner);
  const notificationCount = alertHistory.length;

  function renderMetricWidget(item: {
    label: string;
    value: string;
    Icon: React.ComponentType<{ size?: number }>;
    color: string;
    bg: string;
  }) {
    return (
      <div className="h-full rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="dashboard-widget-handle mb-5 flex cursor-move items-center justify-between">
          <div className={`inline-flex rounded-2xl p-3 ${item.bg} ${item.color}`}>
            <item.Icon size={22} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300">
            Drag
          </span>
        </div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          {item.label}
        </p>
        <h2 className="text-3xl font-black text-slate-900">{item.value}</h2>
      </div>
    );
  }

  function renderTrendWidget() {
    return (
      <div className="h-full min-w-0 rounded-[2rem] bg-white p-8 shadow-sm">
        <div className="dashboard-widget-handle mb-6 flex cursor-move items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">Temperature Trend</h3>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300">
            Drag
          </span>
        </div>

        <div className="h-[calc(100%-3.5rem)] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="colorTemperature"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="temperature"
                stroke="#2563eb"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTemperature)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (!token || !currentUser) {
    if (pageKind !== "login") {
      return (
        <div className="flex min-h-screen items-center justify-center p-6 text-slate-600">
          Dang chuyen den trang dang nhap...
        </div>
      );
    }

    return (
      <div className="min-h-screen p-4 md:p-10 font-sans text-slate-900">
        <div className="mx-auto max-w-7xl">
          <AuthCard
            mode={authMode}
            setMode={setAuthMode}
            authLoading={authLoading}
            authError={authError}
            authInfo={authInfo}
            pendingVerificationEmail={pendingVerificationEmail}
            resendLoading={resendLoading}
            onResendVerification={resendVerification}
            onSubmit={handleAuthSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-10 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">
              Local Weather Station
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              User: {currentUser.email} ({currentUser.role})
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Reading time:{" "}
              {latestReading?.timestamp
                ? new Date(latestReading.timestamp).toLocaleString("vi-VN")
                : "--"}
            </p>
          </div>

          <div className="relative flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Last updated: {lastUpdated || "--"}
            </div>
            <button
              type="button"
              onClick={toggleNotificationPanel}
              className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition hover:bg-slate-50"
            >
              <Bell size={18} />
              {notificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => fetchReadings(false)}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <LogOut size={16} />
              Logout
            </button>

            {isNotificationOpen ? (
              <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Notifications</h2>
                    <p className="text-sm text-slate-500">
                      Alert email history for {selectedDeviceId || "--"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openRuleModal}
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Settings2 size={14} />
                        Edit rules
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNotificationOpen(false)}
                      className="rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                  {alertLoading && alertHistory.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Loading alert history...
                    </div>
                  ) : alertHistory.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No alert emails have been sent yet.
                    </div>
                  ) : (
                    alertHistory.map((entry, index) => (
                      <div
                        key={`${entry.key}-${entry.sentAt}-${index}`}
                        className="rounded-2xl border border-slate-200 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-bold text-slate-900">{entry.label}</div>
                            <div className="text-sm text-slate-500">
                              {entry.rule} • Value: {entry.value}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(entry.sentAt).toLocaleString("vi-VN")}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {claimStatus ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
            {claimStatus}
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
            Failed to load data: {error}
          </div>
        ) : null}

        <section className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm md:p-7">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                <Bluetooth size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Device Pairing</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Connect {BLE_DEVICE_NAME}, assign it to your account, and stream live readings over Bluetooth.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchDevices()}
              disabled={deviceLoading}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:bg-slate-100"
            >
              {deviceLoading ? "Refreshing..." : "Refresh devices"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="rounded-[1.5rem] border border-slate-200 p-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Device ID
                </span>
                <input
                  value={selectedDeviceId}
                  onChange={(event) => setSelectedDeviceId(event.target.value)}
                  list="known-device-ids"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
                  placeholder="ws-001"
                />
                <datalist id="known-device-ids">
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId} />
                  ))}
                </datalist>
              </label>

              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="mb-1 font-semibold text-slate-700">BLE Status</div>
                <div>{bleStatus}</div>
                <div className="mt-2 text-xs text-slate-500">
                  Bridge device: {bleDeviceId || "--"} | {bleConnected ? "Connected" : "Disconnected"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="mb-1 font-semibold text-slate-700">Ownership</div>
                  <div>{isSelectedDeviceOwned ? "Paired" : "Not paired"}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="mb-1 font-semibold text-slate-700">Last Seen</div>
                  <div>
                    {selectedDevice?.lastSeenAt
                      ? new Date(selectedDevice.lastSeenAt).toLocaleString("vi-VN")
                      : "--"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handlePairDeviceFlow}
                  disabled={deviceActionLoading || !selectedDeviceId}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {deviceActionLoading || bleBusy ? "Working..." : "Pair"}
                </button>
                <button
                  type="button"
                  onClick={handleUnpairSelectedDevice}
                  disabled={deviceActionLoading || !selectedDeviceId || !isSelectedDeviceOwned}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                >
                  Unpair
                </button>
                <button
                  type="button"
                  onClick={handleReconnectBle}
                  disabled={bleBusy || !bleDeviceRef.current || bleConnected}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Reconnect
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading && !latestReading ? (
          <div className="rounded-3xl bg-white p-8 text-slate-500 shadow-sm">
            Loading data from backend...
          </div>
        ) : null}

        {!loading && !latestReading && !error ? (
          <div className="rounded-3xl bg-white p-8 text-slate-500 shadow-sm">
            No readings are available for this device yet. Check the pairing state and data stream.
          </div>
        ) : null}

        {latestReading ? (
          <>
            <section className="mb-8">
              <ResponsiveGridLayout
                className="layout"
                layouts={dashboardLayouts}
                breakpoints={{ lg: 1200, md: 996, sm: 0 }}
                cols={{ lg: 12, md: 12, sm: 2 }}
                rowHeight={38}
                margin={[24, 24]}
                containerPadding={[0, 0]}
                draggableHandle=".dashboard-widget-handle"
                onLayoutChange={(_, allLayouts) => setDashboardLayouts(allLayouts)}
              >
                <div key="temperature">
                  {renderMetricWidget({
                    label: "Temperature",
                    value: `${latestReading.temperature.toFixed(1)} C`,
                    Icon: Thermometer,
                    color: "text-orange-500",
                    bg: "bg-orange-50"
                  })}
                </div>
                <div key="humidity">
                  {renderMetricWidget({
                    label: "Humidity",
                    value: `${latestReading.humidity.toFixed(1)}%`,
                    Icon: Droplets,
                    color: "text-blue-500",
                    bg: "bg-blue-50"
                  })}
                </div>
                <div key="wind">
                  {renderMetricWidget({
                    label: "Wind Speed",
                    value: `${latestReading.windSpeed.toFixed(1)} m/s`,
                    Icon: Wind,
                    color: "text-cyan-500",
                    bg: "bg-cyan-50"
                  })}
                </div>
                <div key="rain">
                  {renderMetricWidget({
                    label: "Rain Sensor Wetness",
                    value: `${latestReading.rain.toFixed(0)}%`,
                    Icon: CloudRain,
                    color: "text-indigo-500",
                    bg: "bg-indigo-50"
                  })}
                </div>
                <div key="temperatureTrend" className="h-full">
                  {renderTrendWidget()}
                </div>
                <div key="humidityTrend" className="h-full">
                  <MetricChart
                    title="Humidity Trend"
                    data={chartData}
                    dataKey="humidity"
                    stroke="#0ea5e9"
                    gradientId="colorHumidity"
                    chartHeight="calc(100% - 3.5rem)"
                  />
                </div>
                <div key="windTrend" className="h-full">
                  <MetricChart
                    title="Wind Speed Trend"
                    data={chartData}
                    dataKey="windSpeed"
                    stroke="#06b6d4"
                    gradientId="colorWindSpeed"
                    chartHeight="calc(100% - 3.5rem)"
                  />
                </div>
                <div key="wetnessTrend" className="h-full">
                  <MetricChart
                    title="Wetness Trend"
                    data={chartData}
                    dataKey="rain"
                    stroke="#6366f1"
                    gradientId="colorRain"
                    chartHeight="calc(100% - 3.5rem)"
                  />
                </div>
              </ResponsiveGridLayout>
            </section>
          </>
        ) : null}

        {isRuleModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Edit Alert Rules</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enable or disable each alert type for {selectedDeviceId || "--"}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeRuleModal}
                  className="rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                >
                  <X size={18} />
                </button>
              </div>

              {alertLoading && !alertSettings ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Loading alert settings...
                </div>
              ) : alertRules.length === 0 || !alertSettings || !alertThresholds ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No alert settings are available for this device.
                </div>
              ) : (
                <div className="space-y-3">
                  {alertRules.map((rule) => {
                    const enabled = alertSettings[rule.key];
                    const threshold = alertThresholds[rule.key];
                    const isSaving = alertSavingKey === rule.key;

                    return (
                      <div
                        key={rule.key}
                        className="rounded-2xl border border-slate-200 px-4 py-4"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{rule.label}</div>
                            <div className="text-sm text-slate-500">{buildRuleText(rule)}</div>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                              <span>{enabled ? "On" : "Off"}</span>
                              <input
                                type="checkbox"
                                checked={enabled}
                                disabled={isSaving}
                                onChange={(event) =>
                                  updateAlertRule(rule.key, {
                                    enabled: event.target.checked
                                  })
                                }
                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </label>

                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="font-semibold">Threshold</span>
                              <input
                                type="number"
                                step={rule.key === "windHigh" ? "0.1" : "1"}
                                value={threshold}
                                disabled={isSaving}
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (Number.isNaN(nextValue)) {
                                    return;
                                  }

                                  setAlertThresholds((previous) =>
                                    previous
                                      ? {
                                          ...previous,
                                          [rule.key]: nextValue
                                        }
                                      : previous
                                  );
                                }}
                                onBlur={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (Number.isNaN(nextValue)) {
                                    return;
                                  }

                                  void updateAlertRule(rule.key, {
                                    threshold: nextValue
                                  });
                                }}
                                className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-400"
                              />
                              <span className="text-slate-500">{rule.unit}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closeRuleModal}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
