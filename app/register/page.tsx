"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, User, Lock, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

type SecurityKey = "favoritePet" | "favoriteColor" | "nickname";

const SECURITY_QUESTIONS: { key: SecurityKey; label: string }[] = [
  { key: "favoritePet", label: "What is your favorite pet?" },
  { key: "favoriteColor", label: "What is your favorite color?" },
  { key: "nickname", label: "What is your nickname?" },
];

export default function SignupPage() {
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [securityQuestion, setSecurityQuestion] = useState<SecurityKey | "">("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // 🔹 Normal email/password signup
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!securityQuestion || !securityAnswer.trim()) {
      setError("Please select 1 security question and enter the answer.");
      return;
    }

    const req = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        securityQuestion,
        securityAnswer: securityAnswer.trim(),
      }),
    });

    if (req.status === 201) {
      router.push("/login");
      return;
    }

    const data = await req.json().catch(() => null);
    setError(data?.error || "Signup failed");
  }

  // 🔹 Google signup/login (same thing)
  const handleGoogleRegister = async () => {
    setError("");
    setGoogleLoading(true);

    const res = await signIn("google", {
      redirect: false,
      callbackUrl: "/",
      prompt: "select_account",
    });

    if (res?.error) {
      setGoogleLoading(false);
      setError("Google signup failed. Please try again.");
      return;
    }

    router.push(res?.url || "/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-black">
      <div className="p-8 rounded-3xl bg-white/20 dark:bg-gray-900 border dark:border-gray-700 max-w-md w-full backdrop-blur-lg">
        
        {/* Header */}
        <div className="text-center mb-6">
          <Sparkles className="mx-auto w-8 h-8 text-blue-400" />
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-blue-400">
            Create an Account
          </h2>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-3">
            <User className="w-5 h-5 text-gray-500" />
            <input
              placeholder="Your name"
              required
              className="flex-1 bg-transparent outline-none"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-3">
            <Mail className="w-5 h-5 text-gray-500" />
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="flex-1 bg-transparent outline-none"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          {/* Password */}
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-3">
            <Lock className="w-5 h-5 text-gray-500" />
            <input
              type={showPass ? "text" : "password"}
              required
              placeholder="Password"
              className="flex-1 bg-transparent outline-none"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button type="button" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Security Question
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-3">
            <select
              required
              className="bg-transparent outline-none"
              value={securityQuestion}
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
              required
              placeholder="Enter answer"
              className="bg-transparent outline-none"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 text-white font-semibold"
          >
            Sign Up
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          <span className="text-sm text-gray-500">OR</span>
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Google Signup */}
        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700
          rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-60"
        >
          <FcGoogle className="w-5 h-5" />
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </button>

        <p className="text-center mt-4 text-gray-600 dark:text-gray-400">
          Already have an account?
          <a href="/login" className="text-blue-400 hover:underline ml-1">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
