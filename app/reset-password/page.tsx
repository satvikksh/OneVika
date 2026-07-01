"use client";

import { FormEvent, useEffect, useState } from "react";

export default function ResetPassword() {
  const [challengeId, setChallengeId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("challenge") || "";
    // Reset credentials intentionally live in sessionStorage, never in the URL.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChallengeId(id);
    setResetToken(window.sessionStorage.getItem(`orbitbyte:reset:${id}`) || "");
  }, []);

  async function reset(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (pass !== confirmPass) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, resetToken, pass }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Unable to reset password");
      return;
    }

    window.sessionStorage.removeItem(`orbitbyte:reset:${challengeId}`);
    setDone(true);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="mb-4 text-3xl font-bold">Reset Password</h1>

      {done ? (
        <div className="rounded-xl bg-green-100 p-4 text-green-900">
          Password reset! You may now{" "}
          <a href="/login" className="text-blue-600 underline">login</a>.
        </div>
      ) : resetToken ? (
        <form onSubmit={reset}>
          <p className="mb-5 text-gray-600 dark:text-gray-400">
            Choose a new password for your verified account.
          </p>
          {error && <p className="mb-4 text-red-600">{error}</p>}
          <input
            type="password"
            className="mb-3 w-full rounded-xl border bg-transparent p-3"
            placeholder="New password"
            minLength={8}
            required
            value={pass}
            onChange={(event) => setPass(event.target.value)}
          />
          <input
            type="password"
            className="mb-4 w-full rounded-xl border bg-transparent p-3"
            placeholder="Confirm new password"
            minLength={8}
            required
            value={confirmPass}
            onChange={(event) => setConfirmPass(event.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-white disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      ) : (
        <div className="rounded-xl bg-red-50 p-4 text-red-700">
          This reset session is missing or expired.{" "}
          <a href="/forgot-password" className="underline">Request another OTP</a>.
        </div>
      )}
    </main>
  );
}
