"use client";

import { useState } from "react";

export default function ResetPassword() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [done, setDone] = useState(false);

  async function reset() {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, pass }),
    });

    if (res.status === 200) {
      setDone(true);
    }
  }

  return (
    <div className="max-w-md mx-auto py-20 px-4">
      <h1 className="text-3xl font-bold mb-4">Reset Password</h1>

      {done ? (
        <div className="p-4 bg-green-200 rounded-xl">
          Password reset! You may now{" "}
          <a href="/login" className="text-blue-600 underline">login</a>.
        </div>
      ) : (
        <>
          <input
            className="w-full p-3 border rounded-xl mb-3"
            placeholder="email@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full p-3 border rounded-xl mb-3"
            placeholder="Enter OTP"
            onChange={(e) => setOtp(e.target.value)}
          />

          <input
            type="password"
            className="w-full p-3 border rounded-xl mb-3"
            placeholder="New Password"
            onChange={(e) => setPass(e.target.value)}
          />

          <button
            onClick={reset}
            className="w-full py-3 bg-purple-600 text-white rounded-xl"
          >
            Reset Password
          </button>
        </>
      )}
    </div>
  );
}
