"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Users, Cpu, ActivitySquare, LogOut } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const TOKEN_STORAGE_KEY = "weather-auth-token";
const USER_STORAGE_KEY = "weather-auth-user";

type AuthUser = {
  id: string;
  name?: string;
  email: string;
  role: "admin" | "user";
};

type AdminUserRecord = {
  id: string;
  name?: string;
  email: string;
  role: "admin" | "user";
  isVerified?: boolean;
  isLocked?: boolean;
  createdAt?: string;
  deviceCount: number;
  online: boolean;
};

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

function getStoredUser() {
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

function isDeviceOnline(device: DeviceRecord) {
  return Boolean(device.owner);
}

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedReading, setSelectedReading] = useState<WeatherReading | null>(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userActionLoadingId, setUserActionLoadingId] = useState("");
  const [deviceActionLoadingId, setDeviceActionLoadingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    const storedUser = getStoredUser();

    if (!storedToken || !storedUser) {
      router.replace("/login");
      return;
    }

    if (storedUser.role !== "admin") {
      router.replace("/user");
      return;
    }

    setToken(storedToken);
    setCurrentUser(storedUser);
  }, [router]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void refreshAll(true);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedDeviceId) {
      setSelectedReading(null);
      setIsDeviceModalOpen(false);
      return;
    }

    if (!isDeviceModalOpen) {
      return;
    }

    void fetchLatestReading(selectedDeviceId, token);

    const intervalId = window.setInterval(() => {
      void fetchLatestReading(selectedDeviceId, token);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [isDeviceModalOpen, selectedDeviceId, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void Promise.all([fetchUsers(token), fetchDevices(token)]).catch(
        (refreshError) => {
          const message =
            refreshError instanceof Error
              ? refreshError.message
              : "Failed to refresh admin dashboard";
          setError(message);
        }
      );
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [token]);

  async function fetchUsers(authToken = token) {
    const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      cache: "no-store"
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to load user list");
    }

    setUsers(result.data || []);
  }

  async function fetchDevices(authToken = token) {
    const response = await fetch(`${API_BASE_URL}/api/devices`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      cache: "no-store"
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to load device list");
    }

    const deviceList = (result.data || []) as DeviceRecord[];
    setDevices(deviceList);

    const onlineDevices = deviceList.filter(isDeviceOnline);
    if (onlineDevices.length > 0) {
      const currentStillValid = onlineDevices.some(
        (device) => device.deviceId === selectedDeviceId
      );
      if (!currentStillValid) {
        setSelectedDeviceId(onlineDevices[0].deviceId);
      }
    } else {
      setSelectedDeviceId("");
    }
  }

  async function fetchLatestReading(deviceId: string, authToken = token) {
    const response = await fetch(
      `${API_BASE_URL}/api/readings?deviceId=${deviceId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        cache: "no-store"
      }
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to load latest reading");
    }

    setSelectedReading(result.data?.[0] || null);
  }

  async function refreshAll(showLoading = false) {
    if (!token) {
      return;
    }

    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      await Promise.all([fetchUsers(token), fetchDevices(token)]);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to load admin dashboard";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    router.replace("/login");
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-slate-600">
        Loading admin dashboard...
      </div>
    );
  }

  const managedUsers = users.filter((user) => user.role === "user");
  const onlineUsers = managedUsers.filter((user) => user.online).length;
  const onlineDevices = devices.filter(isDeviceOnline);
  const currentAdminName = currentUser.email.split("@")[0];

  function handleSelectDevice(deviceId: string) {
    setSelectedDeviceId(deviceId);
    setIsDeviceModalOpen(true);
  }

  function closeDeviceModal() {
    setIsDeviceModalOpen(false);
  }

  async function updateUserLock(userId: string, isLocked: boolean) {
    setUserActionLoadingId(userId);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/lock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isLocked })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update user status");
      }

      await fetchUsers(token);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to update user status"
      );
    } finally {
      setUserActionLoadingId("");
    }
  }

  async function forceUnpairDevice(deviceId: string) {
    setDeviceActionLoadingId(deviceId);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/devices/${deviceId}/force-unclaim`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to force-unpair device");
      }

      await Promise.all([fetchUsers(token), fetchDevices(token)]);
      if (selectedDeviceId === deviceId) {
        setSelectedReading(null);
        setIsDeviceModalOpen(false);
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to force-unpair device"
      );
    } finally {
      setDeviceActionLoadingId("");
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-10 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">
              Admin Control
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage users, devices, and the latest metrics from online devices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => refreshAll(false)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
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
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              label: "Total Users",
              value: String(managedUsers.length),
              sub: `${onlineUsers} online`,
              Icon: Users,
              color: "text-emerald-600",
              bg: "bg-emerald-50"
            },
            {
              label: "Total Devices",
              value: String(devices.length),
              sub: `${onlineDevices.length} online`,
              Icon: Cpu,
              color: "text-blue-600",
              bg: "bg-blue-50"
            },
            {
              label: "Current Admin",
              value: currentAdminName,
              sub: "Managing the system",
              Icon: ActivitySquare,
              color: "text-violet-600",
              bg: "bg-violet-50"
            }
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[1.35rem] bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className={`inline-flex rounded-xl p-2.5 ${item.bg} ${item.color}`}>
                  <item.Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {item.label}
                  </p>
                  <h2 className="break-all text-xl font-black leading-tight text-slate-900 md:text-2xl">
                    {item.value}
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">{item.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm">
            <h2 className="mb-1 text-xl font-black text-slate-900">User List</h2>
            <p className="mb-6 text-sm text-slate-500">
              A user is online when they have at least one paired device.
            </p>

            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-slate-500">Loading users...</div>
              ) : managedUsers.length === 0 ? (
                <div className="text-sm text-slate-500">No users found.</div>
              ) : (
                managedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-slate-200 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-900">
                          {user.name || user.email}
                        </div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          user.online
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.online ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Role: {user.role}</span>
                      <div className="flex items-center gap-2">
                        <span>Devices: {user.deviceCount}</span>
                        <button
                          type="button"
                          onClick={() => updateUserLock(user.id, !user.isLocked)}
                          disabled={userActionLoadingId === user.id}
                          className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                            user.isLocked
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          } disabled:opacity-60`}
                        >
                          {userActionLoadingId === user.id
                            ? "Working..."
                            : user.isLocked
                              ? "Unlock"
                              : "Lock"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-sm">
            <h2 className="mb-1 text-xl font-black text-slate-900">Device List</h2>
            <p className="mb-6 text-sm text-slate-500">
              A device is online when it is paired with a user. Click an online device to view its current metrics.
            </p>

            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-slate-500">Loading devices...</div>
              ) : devices.length === 0 ? (
                <div className="text-sm text-slate-500">No devices found.</div>
              ) : (
                devices.map((device) => {
                  const online = isDeviceOnline(device);

                  return (
                    <button
                      key={device.deviceId}
                      type="button"
                      onClick={() => online && handleSelectDevice(device.deviceId)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        selectedDeviceId === device.deviceId && isDeviceModalOpen
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white"
                      } ${online ? "hover:border-blue-300" : "cursor-default opacity-80"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-900">{device.deviceId}</div>
                          <div className="text-sm text-slate-500">
                            {device.owner?.email || "Not paired"}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            online
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {online ? "Online" : "Offline"}
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        Last seen:{" "}
                        {device.lastSeenAt
                          ? new Date(device.lastSeenAt).toLocaleString("vi-VN")
                          : "--"}
                      </div>
                      {online ? (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void forceUnpairDevice(device.deviceId);
                            }}
                            disabled={deviceActionLoadingId === device.deviceId}
                            className="rounded-xl bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            {deviceActionLoadingId === device.deviceId
                              ? "Working..."
                              : "Force Unpair"}
                          </button>
                        </div>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {isDeviceModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Current Metrics</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    You are viewing the latest metrics from the selected online device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDeviceModal}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              {!selectedDeviceId ? (
                <div className="text-sm text-slate-500">
                  No online device is selected.
                </div>
              ) : !selectedReading ? (
                <div className="text-sm text-slate-500">
                  No latest reading is available for {selectedDeviceId}.
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                      Device
                    </div>
                    <div className="font-bold text-slate-900">{selectedReading.deviceId}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                        Temperature
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        {selectedReading.temperature.toFixed(1)} C
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                        Humidity
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        {selectedReading.humidity.toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                        Wind Speed
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        {selectedReading.windSpeed.toFixed(1)} m/s
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                        Wetness
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        {selectedReading.rain.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                      Pressure
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900">
                      {selectedReading.pressure.toFixed(1)} hPa
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Timestamp:{" "}
                    {selectedReading.timestamp
                      ? new Date(selectedReading.timestamp).toLocaleString("vi-VN")
                      : "--"}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
