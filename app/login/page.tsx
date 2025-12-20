"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Mail, Eye, EyeOff, LogIn } from "lucide-react";
import { useTheme } from "../theme-provider";
import { signIn, useSession } from "next-auth/react";

export default function LoginPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const { status } = useSession(); // 🔐 session check

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🚀 Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/feed");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  const res = await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  if (!res) {
    setError("Something went wrong");
    return;
  }

  if (res.error) {
    if (res.error.includes("User not found")) {
      setError("No account found with this email");
    } else if (res.error.includes("Invalid password")) {
      setError("Incorrect password");
    } else {
      setError(res.error);
    }
    return;
  }

  router.push("/feed");
};


  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        isDark ? "bg-black" : "bg-gray-50"
      }`}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div
        className="relative w-full max-w-md p-8 rounded-3xl shadow-xl border backdrop-blur-lg 
        bg-white/20 dark:bg-gray-900/40 border-white/20 dark:border-gray-700"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-gray-800/40 
            rounded-full border border-white/20"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">WELCOME BACK</span>
          </div>

          <h2
            className="text-3xl font-bold mt-4 bg-linear-to-r from-purple-400 to-blue-400 
            bg-clip-text text-transparent"
          >
            Login to Continue
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Access your imagination feed
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block mb-2 text-gray-700 dark:text-gray-300 font-medium">
              Email Address
            </label>
            <div
              className="flex items-center gap-2 bg-white dark:bg-gray-800 border 
              dark:border-gray-700 rounded-xl px-4 py-3"
            >
              <Mail className="w-5 h-5 text-gray-500" />
              <input
                type="email"
                required
                className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-200"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block mb-2 text-gray-700 dark:text-gray-300 font-medium">
              Password
            </label>
            <div
              className="flex items-center gap-2 bg-white dark:bg-gray-800 border 
              dark:border-gray-700 rounded-xl px-4 py-3"
            >
              <Lock className="w-5 h-5 text-gray-500" />
              <input
                type={showPass ? "text" : "password"}
                required
                className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-200"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPass ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 
            bg-linear-to-r from-purple-600 to-blue-500 text-white 
            rounded-xl font-semibold text-lg hover:scale-105 transition
            disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <LogIn className="w-5 h-5" />
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Signup */}
        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
