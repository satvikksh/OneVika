"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, MailCheck } from "lucide-react";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [challengeId, setChallengeId] = useState("");
  const [purpose, setPurpose] = useState<"registration" | "password-reset">("registration");
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // URL state is only available after this client page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChallengeId(params.get("challenge") || "");
    setPurpose(params.get("purpose") === "password-reset" ? "password-reset" : "registration");
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, otp }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Unable to verify OTP");
      return;
    }

    if (data.purpose === "password-reset" && data.resetToken) {
      window.sessionStorage.setItem(`orbitbyte:reset:${challengeId}`, data.resetToken);
      router.replace(data.redirect || `/reset-password?challenge=${challengeId}`);
      return;
    }

    setMessage("Email verified. Your account is ready.");
    window.setTimeout(() => router.replace(data.redirect || "/login"), 900);
  }

  async function resend() {
    if (seconds > 0 || resending) return;
    setError("");
    setMessage("");
    setResending(true);

    const response = await fetch("/api/auth/otp/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId }),
    });
    const data = await response.json().catch(() => ({}));
    setResending(false);

    if (!response.ok) {
      setError(data.error || "Unable to resend OTP");
      if (data.retryAfter) setSeconds(data.retryAfter);
      return;
    }

    setSeconds(data.resendAfter || 60);
    setMessage("A new verification code was sent.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-black">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <MailCheck className="mx-auto h-10 w-10 text-blue-500" />
        <h1 className="mt-4 text-center text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Enter the six-digit code sent to your email. It expires in 10 minutes.
        </p>

        <form onSubmit={verify} className="mt-7 space-y-4">
          <label className="flex items-center gap-3 rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            <KeyRound className="h-5 w-5 text-gray-500" />
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              required
              aria-label="Six-digit verification code"
              placeholder="000000"
              className="min-w-0 flex-1 bg-transparent text-center text-2xl tracking-[0.35em] outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={loading || otp.length !== 6 || !challengeId}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify OTP
          </button>
        </form>

        <button
          type="button"
          onClick={resend}
          disabled={seconds > 0 || resending}
          className="mt-4 w-full text-sm font-medium text-blue-600 disabled:text-gray-400"
        >
          {resending ? "Sending..." : seconds > 0 ? `Resend OTP in ${seconds}s` : "Resend OTP"}
        </button>

        <p className="mt-5 text-center text-xs text-gray-500">
          {purpose === "registration" ? "Account verification" : "Password reset verification"}
        </p>
      </section>
    </main>
  );
}
