"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Landmark,
  RefreshCw,
  TrendingUp,
  XCircle,
} from "lucide-react";

function fmt(value?: number | null) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function inr(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

interface PremiumTotals {
  successfulPayments?: number;
  grossRevenuePaise?: number;
  grossRevenue?: number;
  refundedPaise?: number;
  refunded?: number;
  refundCount?: number;
  netRevenuePaise?: number;
  netRevenue?: number;
  pendingPayments?: number;
  failedPayments?: number;
}

interface RevenueBucket {
  key: string;
  revenuePaise?: number;
  revenue?: number;
  count?: number;
}

interface StatusCount {
  status: string;
  count?: number;
  revenuePaise?: number;
  revenue?: number;
}

interface RecentPayment {
  transactionId: string;
  user?: { email?: string } | null;
  amount?: number;
  amountPaise?: number;
  status: string;
  provider?: string;
  paidAt?: string;
  purpose?: string;
  revenueType?: string;
}

interface PremiumRevenuePayload {
  totals?: PremiumTotals;
  breakdown?: RevenueBucket[];
  statusCounts?: StatusCount[];
  recentPremiumPayments?: RecentPayment[];
}

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  INITIATED: "Initiated",
  PROCESSING: "Processing",
  VERIFICATION_REQUIRED: "Verification Required",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  USER_DROPPED: "User Dropped",
};

export default function PremiumRevenuePage() {
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<PremiumRevenuePayload | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/premium-revenue?groupBy=${groupBy}`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load premium revenue");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load premium revenue");
      console.error("ADMIN PREMIUM REVENUE LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [groupBy]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totals = data?.totals ?? {};
  const breakdown = data?.breakdown ?? [];
  const statusCounts = data?.statusCounts ?? [];
  const recent = data?.recentPremiumPayments ?? [];

  const statusTotal = (label: string) =>
    statusCounts.find((s) => s.status === label)?.count ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black">Premium Revenue</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Platform-level premium revenue from server-verified Cashfree payments.
            </p>
          </div>
          <button
            onClick={() => loadData()}
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

        {!error && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 text-white shadow-lg">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Total Premium Revenue</p>
                    <p className="text-3xl font-black">{inr(totals.grossRevenue ?? 0)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg">
                    <BadgeCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Successful Payments</p>
                    <p className="text-3xl font-black">{fmt(totals.successfulPayments)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Pending / Failed</p>
                    <p className="text-3xl font-black">{fmt((totals.pendingPayments ?? 0) + (totals.failedPayments ?? 0))}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Net Revenue (After Refunds)</p>
                    <p className="text-3xl font-black">{inr(totals.netRevenue ?? 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Gross Revenue</p>
                <p className="text-2xl font-black">{inr(totals.grossRevenue ?? 0)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Refunds ({fmt(totals.refundCount)})</p>
                <p className="text-2xl font-black text-rose-500">− {inr(totals.refunded ?? 0)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Payments by Status</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {statusTotal("COMPLETED")} done
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {totals.pendingPayments ?? 0} pending
                  </span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                    {totals.failedPayments ?? 0} failed
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black">Revenue by {groupBy === "month" ? "Month" : "Day"}</h2>
                <div className="flex gap-1 rounded-2xl border border-slate-200 p-1 dark:border-white/10">
                  <button
                    onClick={() => setGroupBy("day")}
                    className={`rounded-xl px-3 py-1 text-xs font-bold ${groupBy === "day" ? "bg-slate-900 text-white dark:bg-white dark:text-black" : ""}`}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setGroupBy("month")}
                    className={`rounded-xl px-3 py-1 text-xs font-bold ${groupBy === "month" ? "bg-slate-900 text-white dark:bg-white dark:text-black" : ""}`}
                  >
                    Month
                  </button>
                </div>
              </div>
              {loading ? (
                <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
              ) : breakdown.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No premium revenue recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {breakdown.map((b) => (
                    <div key={b.key} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm dark:border-white/10">
                      <div>
                        <p className="font-bold">{b.key}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{fmt(b.count)} payment(s)</p>
                      </div>
                      <p className="font-black">{inr(b.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <h2 className="mb-3 text-lg font-black">Recent Premium Payments</h2>
              {loading ? (
                <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
              ) : recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No recent premium payments.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-white/10 dark:text-slate-400">
                        <th className="px-3 py-2">Transaction</th>
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Paid At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((t) => (
                        <tr key={t.transactionId} className="border-b border-slate-100 dark:border-white/10">
                          <td className="px-3 py-2 font-mono text-xs">{t.transactionId}</td>
                          <td className="px-3 py-2">{t.user?.email ?? "—"}</td>
                          <td className="px-3 py-2 font-bold">{inr(t.amount)}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                t.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-white/10"
                              }`}
                            >
                              {STATUS_LABEL[t.status] ?? t.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">{t.paidAt ? new Date(t.paidAt).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
