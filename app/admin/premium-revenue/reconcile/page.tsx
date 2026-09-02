"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Wallet } from "lucide-react";

function inr(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    (paise || 0) / 100
  );
}

interface ReconcileItem {
  userId: string;
  premiumTransactionCount?: number;
  miscreditedTotalPaise?: number;
  walletAvailablePaise?: number;
  walletAvailableAfterPaise?: number;
  reversePaise?: number;
}

interface ReconcilePayload {
  dryRun?: boolean;
  appliedCount?: number;
  totalReversePaise?: number;
  items?: ReconcileItem[];
  message?: string;
}

export default function PremiumRevenueReconcilePage() {
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [report, setReport] = useState<ReconcilePayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/premium-revenue/reconcile", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load reconciliation report");
      setReport(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load report");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async () => {
    if (!window.confirm("This will remove incorrectly-attributed Premium balances from buyer wallets. The original PaymentTransactions are preserved as platform revenue and are NOT deleted. Continue?")) {
      return;
    }
    setApplying(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/admin/premium-revenue/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: true }),
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Reconciliation failed");
      setReport(payload);
      setInfo(payload.message || "Reconciliation applied.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Premium Revenue Reconciliation</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Removes Premium revenue that was historically mis-attributed to buyer wallets.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        {info && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            {info}
          </div>
        )}

        {!loading && report && (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">To reconcile</p>
                  <p className="text-2xl font-black">{inr(report.totalReversePaise)}</p>
                </div>
              </div>
              <button
                onClick={apply}
                disabled={applying || report.appliedCount === 0}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-50"
              >
                <Wallet size={16} />
                {applying ? "Applying…" : report.dryRun ? "Apply Reconciliation" : "Done"}
              </button>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-white/10 dark:text-slate-400">
                    <th className="px-3 py-2">User ID</th>
                    <th className="px-3 py-2">Premium Tx</th>
                    <th className="px-3 py-2">Mis-attributed</th>
                    <th className="px-3 py-2">Wallet (avail.)</th>
                    <th className="px-3 py-2">Will reverse</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.items ?? []).map((r) => (
                    <tr key={r.userId} className="border-b border-slate-100 dark:border-white/10">
                      <td className="px-3 py-2 font-mono text-xs">{r.userId}</td>
                      <td className="px-3 py-2">{r.premiumTransactionCount}</td>
                      <td className="px-3 py-2">{inr(r.miscreditedTotalPaise)}</td>
                      <td className="px-3 py-2">{inr(r.walletAvailablePaise ?? r.walletAvailableAfterPaise ?? 0)}</td>
                      <td className="px-3 py-2 font-bold">{inr(r.reversePaise)}</td>
                    </tr>
                  ))}
                  {!(report.items ?? []).length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-400">
                        No wallets need reconciliation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
