"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TOKEN_STORAGE_KEY = "weather-auth-token";
const USER_STORAGE_KEY = "weather-auth-user";

type StoredUser = {
  role: "admin" | "user";
};

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);
    const storedUser = rawUser ? (JSON.parse(rawUser) as StoredUser) : null;

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    router.replace(storedUser.role === "admin" ? "/admin" : "/user");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f7fb] p-6 text-slate-600">
      Dang dieu huong...
    </div>
  );
}
