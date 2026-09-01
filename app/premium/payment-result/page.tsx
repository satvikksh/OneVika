"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ResultState =
  | { kind: "checking" }
  | { kind: "success"; alreadyProcessed: boolean; expiresAt: string | null }
  | { kind: "pending"; message: string }
  | { kind: "error"; message: string };

/**
 * Cashfree return-url landing page.
 *
 * Reached when the user is redirected back after the hosted checkout (mobile /
 * _self flows) OR when the checkout modal closes. It re-verifies the payment
 * server-side via /api/premium/activate (authoritative, idempotent) and only
 * reports success when Cashfree has confirmed PAID.
 */
export default function PaymentResultPage() {
  const [state, setState] = useState<ResultState>({ kind: "checking" });

  const verify = useCallback(async (transactionId: string) => {
    setState({ kind: "checking" });
    try {
      const res = await fetch("/api/premium/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (String(data.code || "").toUpperCase() === "PENDING") {
          setState({ kind: "pending", message: data.error || "Waiting for payment confirmation..." });
        } else {
          setState({ kind: "error", message: data.error || "Payment could not be verified." });
        }
        return;
      }
      setState({
        kind: "success",
        alreadyProcessed: Boolean(data.alreadyProcessed),
        expiresAt: data.premiumExpiresAt || null,
      });
    } catch {
      setState({ kind: "error", message: "Payment could not be verified right now. Please try again." });
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get("transactionId");
    if (!transactionId) {
      const t = setTimeout(() => {
        setState({ kind: "error", message: "Missing transaction reference." });
      }, 0);
      return () => clearTimeout(t);
    }
    verify(transactionId);
  }, [verify]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c0c] p-8 text-center shadow-2xl">
        <h1 className="text-xl font-bold">Premium Membership</h1>
        <div className="mt-6 min-h-[80px] flex flex-col items-center justify-center gap-3">
          {state.kind === "checking" && (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-teal-400" />
              <p className="text-sm text-white/60">Verifying payment...</p>
            </>
          )}
          {state.kind === "success" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/20 text-2xl text-teal-400">
                ✓
              </div>
              <p className="text-base font-semibold text-teal-400">
                {state.alreadyProcessed ? "Premium already active" : "Premium activated!"}
              </p>
              {state.expiresAt && (
                <p className="text-xs text-white/50">
                  Valid until {new Date(state.expiresAt).toLocaleString()}
                </p>
              )}
            </>
          )}
          {state.kind === "pending" && (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-amber-400" />
              <p className="text-sm text-amber-300">{state.message}</p>
            </>
          )}
          {state.kind === "error" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-2xl text-red-400">
                ✕
              </div>
              <p className="text-sm text-red-300">{state.message}</p>
            </>
          )}
        </div>
        <Link
          href="/profile"
          className="mt-6 inline-block w-full rounded-full bg-teal-500 px-4 py-2.5 text-sm font-bold text-black"
        >
          Back to profile
        </Link>
      </div>
    </main>
  );
}