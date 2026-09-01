"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  UNDER_REVIEW: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  PROCESSING: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function inr(value?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  const cls = STATUS_COLORS[status] || "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

interface RefundRow {
  _id: string;
  refundId: string;
  paymentTransactionId: string;
  transactionId?: string;
  email?: string;
  name?: string;
  amount?: number;
  amountPaise?: number;
  currency?: string;
  reason?: string;
  adminNote?: string;
  status: string;
  createdAt?: string;
  processedAt?: string;
  completedAt?: string;
}

export default function AdminRefundsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [table, setTable] = useState({ data: [] as RefundRow[], total: 0, page: 1, pageSize: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/payments/refunds?page=${page}&pageSize=${pageSize}&status=${status}`,
        { cache: "no-store" }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load refunds");
      setTable(payload.table);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load refunds");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAction = async (row: RefundRow, action: "approve" | "reject" | "complete") => {
    setBusyId(row._id);
    setActionMsg("");
    try {
      const res = await fetch("/api/admin/payments/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, refundId: row.refundId, reason: "admin_manual" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Action failed");
      setActionMsg(`Refund ${action}d successfully`);
      void loadData();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Refund Management</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review, approve, and complete refund requests.
        </p>
      </div>

      {actionMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {actionMsg}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
        >
          <option value="">All statuses</option>
          {["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "COMPLETED", "FAILED", "REJECTED"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button
          onClick={() => { setPage(1); void loadData(); }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]">
              <tr>
                {["Refund", "Payment", "User", "Amount", "Reason", "Status", "Requested", "Completed", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">Loading refunds…</td></tr>
              ) : table.data.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No refunds found</td></tr>
              ) : (
                table.data.map((row) => (
                  <tr key={row._id} className="border-b border-slate-100 last:border-0 dark:border-white/5 hover:bg-slate-50/60 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-mono text-xs">{row.refundId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{row.transactionId || "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.name || "Unknown"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.email}</p>
                    </td>
                    <td className="px-4 py-3 font-bold">{inr(row.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[220px] truncate">{row.reason || "—"}</td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(row.completedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {["REQUESTED", "UNDER_REVIEW"].includes(row.status) && (
                          <>
                            <button
                              disabled={busyId === row._id}
                              onClick={() => void handleAction(row, "approve")}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} /> Approve
                            </button>
                            <button
                              disabled={busyId === row._id}
                              onClick={() => void handleAction(row, "reject")}
                              className="flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        {row.status === "APPROVED" && (
                          <button
                            disabled={busyId === row._id}
                            onClick={() => void handleAction(row, "complete")}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} /> Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-white/10">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing {table.total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, table.total)} of {table.total}
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:border-white/10">
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm">Page {page} of {Math.max(1, table.totalPages)}</span>
            <button disabled={page >= table.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:border-white/10">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
