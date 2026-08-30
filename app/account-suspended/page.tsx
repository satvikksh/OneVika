"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ShieldAlert, Mail, LogOut } from "lucide-react";
import {
  ACCOUNT_SUSPENDED_MESSAGE,
  REVIEW_EMAIL,
} from "../lib/account-policy";

export default function AccountSuspendedPage() {
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  const reviewHref = `mailto:${REVIEW_EMAIL}?subject=${encodeURIComponent(
    "Account suspension review request"
  )}${session?.user?.email ? `&body=${encodeURIComponent(`Account email: ${session.user.email}\n\nPlease review my account suspension.`)}` : ""}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#040b18] p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1b31] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15">
          <ShieldAlert size={30} className="text-rose-400" />
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-white">
          Account Suspended
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {ACCOUNT_SUSPENDED_MESSAGE}
        </p>

        {session?.user?.email ? (
          <p className="mt-2 text-xs text-slate-400">
            Account: <span className="font-semibold text-slate-200">{session.user.email}</span>
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1626] p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            What happens to your data
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Your posts, videos, followers, projects, messages, earnings, and
            history are all preserved. Nothing is deleted, and full access is
            restored automatically once the suspension is lifted.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 text-left">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
            <Mail size={14} /> Request a review
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            If you believe this suspension is a mistake, email us at{" "}
            <a
              href={reviewHref}
              className="font-bold text-sky-300 underline decoration-sky-400/40 underline-offset-4 hover:text-sky-200"
            >
              {REVIEW_EMAIL}
            </a>{" "}
            with your account email and a short explanation. Our team will
            review your case.
          </p>
        </div>

        <button
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          <LogOut size={16} />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}