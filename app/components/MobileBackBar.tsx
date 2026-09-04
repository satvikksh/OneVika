"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 active:scale-95 dark:text-gray-200 dark:hover:bg-white/10 ${className}`}
    >
      <ArrowLeft size={22} />
    </button>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/analytics": "Analytics",
  "/discover": "Discover",
  "/jobs": "Jobs",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/gallery": "Gallery",
  "/projects": "Projects",
  "/projects/add": "Add Project",
  "/projects/own": "Own Projects",
  "/projects/other": "Other Projects",
  "/cosmic-archives": "Cosmic Archives",
  "/help": "Help & Support",
  "/about": "About OrbitByte",
  "/contact": "Contact",
  "/join": "Join OrbitByte",
  "/manifesto": "Manifesto",
  "/legal": "Legal",
  "/terms-and-conditions": "Terms & Conditions",
  "/privacy-policy": "Privacy Policy",
  "/cookie-policy": "Cookie Policy",
  "/content-policy": "Content Policy",
  "/community-guidelines": "Community Guidelines",
  "/ai-usage-policy": "AI Usage Policy",
  "/copyright-policy": "Copyright Policy",
  "/login": "Login",
  "/register": "Create Account",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
  "/verify-otp": "Verify OTP",
};

function humanize(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname === "/") return "OrbitByte";
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  return last ? humanize(last) : "OrbitByte";
}

export default function MobileBackBar() {
  const pathname = usePathname() ?? "/";

  return (
    <header
      className="lg:hidden sticky top-0 z-40 border-b border-gray-200 bg-white/85 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/85"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-14 items-center gap-1 px-2">
        <BackButton />
        <h1 className="truncate text-base font-semibold text-gray-900 dark:text-white">
          {resolveTitle(pathname)}
        </h1>
      </div>
    </header>
  );
}