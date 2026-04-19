"use client";

import React, { useState } from "react";

type AuthMode = "login" | "register";

export function AuthCard({
  mode,
  setMode,
  authLoading,
  authError,
  authInfo,
  pendingVerificationEmail,
  resendLoading,
  onResendVerification,
  onSubmit
}: {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  authLoading: boolean;
  authError: string;
  authInfo: string;
  pendingVerificationEmail: string;
  resendLoading: boolean;
  onResendVerification: (email: string) => Promise<void>;
  onSubmit: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ name, email, password });
  }

  return (
    <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 shadow-sm">
      <div className="mb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">
          Weather Station Access
        </p>
        <h1 className="text-3xl font-black text-slate-900">
          {mode === "login" ? "Dang nhap" : "Dang ky"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {mode === "login"
            ? "Dang nhap de xem du lieu va claim thiet bi."
            : "Tao tai khoan de quan ly thiet bi cua ban."}
        </p>
      </div>

      {authError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {authError}
        </div>
      ) : null}

      {authInfo ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {authInfo}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Ho ten
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
              placeholder="Nguyen Van A"
            />
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            placeholder="name@email.com"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Mat khau
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            placeholder="Toi thieu 6 ky tu"
            required
          />
        </div>

        <button
          type="submit"
          disabled={authLoading}
          className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
        >
          {authLoading
            ? "Dang xu ly..."
            : mode === "login"
              ? "Dang nhap"
              : "Dang ky"}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-slate-500">
        {mode === "login" ? "Chua co tai khoan?" : "Da co tai khoan?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="font-semibold text-blue-600"
        >
          {mode === "login" ? "Dang ky" : "Dang nhap"}
        </button>
      </div>

      {mode === "login" && pendingVerificationEmail ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => onResendVerification(pendingVerificationEmail)}
            disabled={resendLoading}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:bg-slate-100"
          >
            {resendLoading ? "Dang gui lai mail..." : "Gui lai email xac thuc"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
