"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, User, Lock, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

export default function SignupPage() {
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // 🔹 Normal email/password signup
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const req = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (req.status === 201) {
      router.push("/login");
    }
  }

  // 🔹 Google signup/login (same thing)
  const handleGoogleRegister = async () => {
    await signIn("google", {
      callbackUrl: "/feed",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-black">
      <div className="p-8 rounded-3xl bg-white/20 dark:bg-gray-900 border dark:border-gray-700 max-w-md w-full backdrop-blur-lg">
        
        {/* Header */}
        <div className="text-center mb-6">
          <Sparkles className="mx-auto w-8 h-8 text-purple-400" />
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400">
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

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-linear-to-r from-purple-600 to-blue-500 text-white font-semibold"
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
          className="w-full flex items-center justify-center gap-3 py-3
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700
          rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <FcGoogle className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="text-center mt-4 text-gray-600 dark:text-gray-400">
          Already have an account?
          <a href="/login" className="text-purple-400 hover:underline ml-1">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
