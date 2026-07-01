"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Unable to send verification code");
      return;
    }

    router.push(
      `/verify-otp?purpose=password-reset&challenge=${encodeURIComponent(data.challengeId)}`
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="mb-4 text-3xl font-bold">Forgot Password</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Enter your registered email and we’ll send a secure verification code.
      </p>

      <form onSubmit={requestOtp}>
        {error && <p className="mb-4 text-red-600">{error}</p>}
        <input
          type="email"
          className="mb-4 w-full rounded-xl border bg-transparent p-3"
          placeholder="email@example.com"
          value={email}
          required
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-3 text-white disabled:opacity-60"
        >
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>
    </main>
  );
}
