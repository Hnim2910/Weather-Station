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
  onForgotPassword,
  onResetPassword,
  resetToken,
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
  onForgotPassword: (email: string) => Promise<void>;
  onResetPassword: (payload: { token: string; password: string }) => Promise<void>;
  resetToken: string;
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

    if (resetToken) {
      await onResetPassword({ token: resetToken, password });
      return;
    }

    await onSubmit({ name, email, password });
  }

  return (
    <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 shadow-sm">
      <div className="mb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">
          Weather Station Access
        </p>
        <h1 className="text-3xl font-black text-slate-900">
          {resetToken ? "Reset Password" : mode === "login" ? "Login" : "Register"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {resetToken
            ? "Enter a new password for your account."
            : mode === "login"
              ? "Sign in to monitor data and manage your devices."
              : "Create an account to manage your weather station."}
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
        {mode === "register" && !resetToken ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Full Name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
              placeholder="Nguyen Van A"
            />
          </div>
        ) : null}

        {!resetToken ? (
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
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {resetToken ? "New Password" : "Password"}
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
            ? "Processing..."
            : resetToken
              ? "Reset Password"
              : mode === "login"
                ? "Login"
                : "Register"}
        </button>
      </form>

      {!resetToken ? (
        <div className="mt-4 space-y-3 text-center text-sm text-slate-500">
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => void onForgotPassword(email)}
              className="font-semibold text-blue-600"
            >
              Forgot password?
            </button>
          ) : null}

          <div>
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-semibold text-blue-600"
            >
              {mode === "login" ? "Register" : "Login"}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "login" && pendingVerificationEmail ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => onResendVerification(pendingVerificationEmail)}
            disabled={resendLoading}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:bg-slate-100"
          >
            {resendLoading ? "Sending verification email..." : "Resend verification email"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
