"use client";

import { useState } from "react";

type SecurityKey = "favoritePet" | "favoriteColor" | "nickname";

const SECURITY_QUESTIONS: { key: SecurityKey; label: string }[] = [
  { key: "favoritePet", label: "What is your favorite pet?" },
  { key: "favoriteColor", label: "What is your favorite color?" },
  { key: "nickname", label: "What is your nickname?" },
];

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState<SecurityKey | "">("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function changePassword() {
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        securityQuestion,
        securityAnswer: securityAnswer.trim(),
        pass: newPassword,
      }),
    });

    if (!res.ok) {
      const message = await res.text();
      setError(message || "Unable to reset password");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto py-20 px-4">
      <h1 className="text-3xl font-bold mb-4">Forgot Password</h1>

      {done ? (
        <div className="p-4 bg-green-100 rounded-xl">
          Password changed successfully. Go to{" "}
          <a href="/login" className="text-blue-600 underline">
            Login
          </a>
          .
        </div>
      ) : (
        <>
          <p className="mb-4">
            Enter your email, select your security question, and set a new password.
          </p>

          {error && <p className="mb-4 text-red-600">{error}</p>}

          <input
            type="email"
            className="w-full p-3 border rounded-xl mb-4"
            placeholder="gmail@example.com"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />

          <select
            className="w-full p-3 border rounded-xl mb-4"
            value={securityQuestion}
            required
            onChange={(e) => setSecurityQuestion(e.target.value as SecurityKey)}
          >
            <option value="">Select security question</option>
            {SECURITY_QUESTIONS.map((question) => (
              <option key={question.key} value={question.key}>
                {question.label}
              </option>
            ))}
          </select>

          <input
            className="w-full p-3 border rounded-xl mb-4"
            placeholder="Enter security answer"
            value={securityAnswer}
            required
            onChange={(e) => setSecurityAnswer(e.target.value)}
          />

          <input
            type="password"
            className="w-full p-3 border rounded-xl mb-4"
            placeholder="Enter new password"
            value={newPassword}
            required
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <button
            onClick={changePassword}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl"
          >
            {loading ? "Changing..." : "Change Password"}
          </button>
        </>
      )}
    </div>
  );
}
