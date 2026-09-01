"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ScanSearch } from "lucide-react";

const SEVERITY_STYLE: Record<string, string> = {
  high: "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10",
  medium: "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10",
  low: "border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10",
};

const TYPE_LABELS: Record<string, string> = {
  ORDER_PAID_TX_NOT_COMPLETED: "Paid order without completed payment",
  TX_COMPLETED_ORDER_NOT_PAID: "Completed payment without paid order",
  ACTIVE_NO_PAYMENT: "Active member with no payment",
  DUPLICATE_PAYMENTS: "Duplicate membership payments",
  REFUNDED_BUT_ACTIVE: "Refunded but membership active",
};

interface ReconciliationIssue {
  type: string;
  severity: "high" | "medium" | "low";
  userId?: string;
  email?: string;
  name?: string;
  orderId?: string;
  transactionId?: string;
  message: string;
  count?: number;
  amount?: number;
}

interface ReconciliationResult {
  total: number;
  byType: Record<string, number>;
  issues: ReconciliationIssue[];
  scannedAt: string;
}

export default function AdminReconciliationPage() {
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reconciliation", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to run reconciliation");
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run reconciliation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Payment Reconciliation</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Detects payment, order, and membership inconsistencies. Review only — nothing is auto-modified.
          </p>
        </div>
        <button
          onClick={() => void run()}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Re-run scan
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          Running reconciliation scan…
        </div>
      ) : result ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            {result.total === 0 ? (
              <CheckCircle2 size={22} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={22} className="text-amber-500" />
            )}
            <div>
              <p className="text-lg font-black">
                {result.total === 0 ? "No inconsistencies found" : `${result.total} issue(s) found`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scanned at {new Date(result.scannedAt).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              {Object.entries(result.byType || {}).map(([k, v]) => (
                <span key={k} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-white/10">
                  {TYPE_LABELS[k] || k}: {String(v)}
                </span>
              ))}
            </div>
          </div>

          {result.issues.length === 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <ScanSearch size={28} className="mx-auto mb-2 text-emerald-500" />
              <p className="font-bold text-emerald-700 dark:text-emerald-300">All payment records are consistent.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.issues.map((issue: ReconciliationIssue, idx: number) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 ${SEVERITY_STYLE[issue.severity] || SEVERITY_STYLE.low}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide dark:bg-black/20">
                      {issue.type.replace(/_/g, " ")}
                    </span>
                    <span className={`text-xs font-bold uppercase ${issue.severity === "high" ? "text-rose-600 dark:text-rose-400" : issue.severity === "medium" ? "text-amber-600 dark:text-amber-400" : "text-sky-600 dark:text-sky-400"}`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{issue.message}</p>
                  {(issue.orderId || issue.transactionId || issue.email) && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {issue.email && `User: ${issue.email}${issue.name ? ` (${issue.name})` : ""}`}
                      {issue.orderId && ` · Order: ${issue.orderId}`}
                      {issue.transactionId && ` · Tx: ${issue.transactionId}`}
                      {issue.amount && ` · Amount: ${issue.amount}`}
                      {issue.count && ` · Count: ${issue.count}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
