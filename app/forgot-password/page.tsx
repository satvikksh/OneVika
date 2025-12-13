"use client";

import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function sendOTP() {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setOtp(data.otp); // Show OTP on screen
    setSent(true);
  }

  return (
    <div className="max-w-md mx-auto py-20 px-4">
      <h1 className="text-3xl font-bold mb-4">Forgot Password</h1>

      {!sent ? (
        <>
          <p className="mb-4">Enter your email to receive an OTP.</p>

          <input
            type="email"
            className="w-full p-3 border rounded-xl mb-4"
            placeholder="email@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            onClick={sendOTP}
            className="w-full py-3 bg-purple-600 text-white rounded-xl"
          >
            Send OTP
          </button>
        </>
      ) : (
        <div className="p-4 bg-green-100 rounded-xl">
          <p>OTP generated:</p>
          <p className="font-bold text-2xl">{otp}</p>

          <p className="mt-4">
            Go to reset password page → <a href="/reset-password" className="text-blue-600 underline">Reset</a>
          </p>
        </div>
      )}
    </div>
  );
}
