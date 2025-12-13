"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, User, Lock, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSubmit(e: any) {
    e.preventDefault();

    const req = await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify(form),
    });

    if (req.status === 201) {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-black">
      <div className="p-8 rounded-3xl bg-white/20 dark:bg-gray-900 border dark:border-gray-700 max-w-md w-full backdrop-blur-lg">
        
        <div className="text-center mb-6">
          <Sparkles className="mx-auto w-8 h-8 text-purple-400" />
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400">
            Create an Account
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-3">
            <User className="w-5 h-5 text-gray-500" />
            <input
              placeholder="Your name"
              className="flex-1 bg-transparent outline-none"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-3">
            <Mail className="w-5 h-5 text-gray-500" />
            <input
              type="email"
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

        <p className="text-center mt-4">
          Already have an account?
          <a href="/login" className="text-purple-400 hover:underline"> Login</a>
        </p>
      </div>
    </div>
  );
}
