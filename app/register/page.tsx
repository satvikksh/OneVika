"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Mail, User, Lock, Eye, EyeOff, Camera } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import AvatarCropperModal from "../components/AvatarCropperModal";
import {
  getAuthErrorMessage,
  getSafeCallbackUrl,
} from "../lib/authClient";

type SecurityKey = "favoritePet" | "favoriteColor" | "nickname";

const SECURITY_QUESTIONS: { key: SecurityKey; label: string }[] = [
  { key: "favoritePet", label: "What is your favorite pet?" },
  { key: "favoriteColor", label: "What is your favorite color?" },
  { key: "nickname", label: "What is your nickname?" },
];

export default function SignupPage() {
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const authError = getAuthErrorMessage(searchParams.get("error"));
  const { status } = useSession();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [securityQuestion, setSecurityQuestion] = useState<SecurityKey | "">("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [cropSourceUrl, setCropSourceUrl] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  useEffect(() => {
    return () => {
      if (profilePreview) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [profilePreview]);

  useEffect(() => {
    return () => {
      if (cropSourceUrl) {
        URL.revokeObjectURL(cropSourceUrl);
      }
    };
  }, [cropSourceUrl]);

  const startCrop = (file: File | null) => {
    if (!file) return;
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    const src = URL.createObjectURL(file);
    setCropSourceUrl(src);
    setShowCropper(true);
  };

  // 🔹 Normal email/password signup
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!securityQuestion || !securityAnswer.trim()) {
      setError("Please select 1 security question and enter the answer.");
      setSubmitting(false);
      return;
    }

    const payload = new FormData();
    payload.append("name", form.name);
    payload.append("email", form.email);
    payload.append("password", form.password);
    payload.append("securityQuestion", securityQuestion);
    payload.append("securityAnswer", securityAnswer.trim());
    
    if (profileFile) {
      payload.append("file", profileFile);
    }

    const req = await fetch("/api/register", {
      method: "POST",
      body: payload,
    });

    const data = await req.json().catch(() => null);

    if (req.status === 202 && data?.challengeId) {
      router.push(
        `/verify-otp?purpose=registration&challenge=${encodeURIComponent(data.challengeId)}`
      );
      return;
    }

    setError(data?.error || "Signup failed");
    setSubmitting(false);
  }

  // 🔹 Google signup/login (same thing)
  const handleGoogleRegister = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      await signIn(
        "google",
        { callbackUrl },
        { prompt: "select_account" }
      );
    } catch (error) {
      console.error("Google signup failed:", error);
      setGoogleLoading(false);
      setError("Google signup failed. Please try again.");
    }
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
          <div className="rounded-2xl border border-gray-300 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <p className="text-sm font-semibold mb-3">Set Profile Picture (Optional)</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                {profilePreview ? (
                  <img src={profilePreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <User size={24} />
                  </div>
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
                <Camera size={16} />
                Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    startCrop(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>

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

          {(error || authError) && (
            <p className="text-sm text-red-600">{error || authError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 text-white font-semibold disabled:opacity-60"
          >
            {submitting ? "Sending verification code..." : "Sign Up"}
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

      <AvatarCropperModal
        isOpen={showCropper}
        imageSrc={cropSourceUrl}
        onCancel={() => {
          setShowCropper(false);
          if (cropSourceUrl) {
            URL.revokeObjectURL(cropSourceUrl);
            setCropSourceUrl("");
          }
        }}
        onApply={(croppedFile) => {
          if (profilePreview) {
            URL.revokeObjectURL(profilePreview);
          }
          const nextPreview = URL.createObjectURL(croppedFile);
          setProfileFile(croppedFile);
          setProfilePreview(nextPreview);
          setShowCropper(false);
          if (cropSourceUrl) {
            URL.revokeObjectURL(cropSourceUrl);
            setCropSourceUrl("");
          }
        }}
      />
    </div>
  );
}
