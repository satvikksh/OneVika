"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  RefreshCw,
  X,
} from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  INITIATED: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PROCESSING: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  VERIFICATION_REQUIRED: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  CANCELLED: "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  REFUNDED: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  PARTIALLY_REFUNDED: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

const PURPOSE_LABELS: Record<string, string> = {
  membership: "Premium Membership",
  wallet_credit: "Wallet Credit",
  wallet_debit: "Wallet Debit",
  refund: "Refund",
  payout: "Payout",
  other: "Other",
};

function inr(value?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function badge(status: string) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[status] || "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

interface PaymentRecord {
  transactionId: string;
  orderId?: string | null;
  amount?: number;
  amountPaise?: number;
  currency?: string;
  status: string;
  purpose?: string;
  paymentMethod?: string | null;
  paymentMethodName?: string | null;
  providerReference?: string | null;
  createdAt?: string;
  completedAt?: string;
  failedAt?: string;
  metadata?: unknown;
}

const receiptFields = (tx: PaymentRecord) => [
  { label: "Transaction ID", value: tx.transactionId },
  { label: "Order ID", value: tx.orderId || "—" },
  { label: "Purpose", value: PURPOSE_LABELS[tx.purpose || ""] || tx.purpose || "—" },
  { label: "Payment Method", value: (tx.paymentMethodName || tx.paymentMethod || "—").toUpperCase() },
  { label: "Status", value: tx.status.replace(/_/g, " ") },
  { label: "Date", value: formatDateTime(tx.createdAt) },
  { label: "Paid On", value: formatDateTime(tx.completedAt) },
  { label: "Provider Reference", value: tx.providerReference || "—" },
];

export default function UserPaymentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const loadingSession = status === "loading";
  const isAuthed = !!session?.user?.id;

  const [transactions, setTransactions] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<PaymentRecord | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  const load = useCallback(async () => {
    if (!isAuthed) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set("status", statusFilter);
      if (purposeFilter) params.set("purpose", purposeFilter);
      const res = await fetch(`/api/payments?${params.toString()}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load payment history");
      setTransactions(payload.transactions || []);
      setTotal(payload.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payment history");
    } finally {
      setLoading(false);
    }
  }, [isAuthed, page, limit, statusFilter, purposeFilter]);

  useEffect(() => {
    if (isAuthed) void load();
  }, [load, isAuthed]);

  const openReceipt = async (txId: string) => {
    setReceipt(null);
    setReceiptLoading(true);
    setReceiptError("");
    try {
      const res = await fetch(`/api/payments/${encodeURIComponent(txId)}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load receipt");
      setReceipt(payload.transaction);
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : "Unable to load receipt");
    } finally {
      setReceiptLoading(false);
    }
  };

  if (loadingSession) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading…</div>;
  }

  if (!isAuthed) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <LayoutDashboard size={32} className="mx-auto mb-3 text-slate-400" />
          <p className="mb-4 font-bold">Please sign in to view your payment history.</p>
          <button
            onClick={() => router.push("/signin")}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Payment History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your transactions with OrbitByte. Receipts are available for completed payments.
          </p>
        </div>
        <button
          onClick={() => { setPage(1); void load(); }}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-white/10"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
          <option value="">All statuses</option>
          {["COMPLETED", "PENDING", "PROCESSING", "FAILED", "CANCELLED", "REFUNDED"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select value={purposeFilter} onChange={(e) => { setPurposeFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
          <option value="">All purposes</option>
          {Object.entries(PURPOSE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]">
              <tr>
                {["Date", "Description", "Amount", "Status", "Receipt"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading payment history…</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No payments found.</td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.transactionId} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{formatDateTime(tx.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{PURPOSE_LABELS[tx.purpose] || tx.purpose}</p>
                      <p className="font-mono text-[10px] text-slate-400">{tx.transactionId}</p>
                    </td>
                    <td className="px-4 py-3 font-bold">{inr(tx.amount)}</td>
                    <td className="px-4 py-3">{badge(tx.status)}</td>
                    <td className="px-4 py-3">
                      {["COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(tx.status) ? (
                        <button
                          onClick={() => void openReceipt(tx.transactionId)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          <FileText size={12} /> Receipt
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span>{total} payment(s)</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1 font-bold disabled:opacity-40 dark:border-white/10">Prev</button>
            <button disabled={page * limit >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1 font-bold disabled:opacity-40 dark:border-white/10">Next</button>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      {receipt !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setReceipt(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-4 text-white dark:border-white/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span className="font-black">OrbitByte Receipt</span>
              </div>
              <button onClick={() => setReceipt(null)} className="rounded-lg p-1 hover:bg-white/20"><X size={18} /></button>
            </div>
            {receiptLoading ? (
              <div className="p-6 text-center text-sm text-slate-500">Loading receipt…</div>
            ) : receiptError ? (
              <div className="p-6 text-center text-sm text-rose-600">{receiptError}</div>
            ) : receipt ? (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Paid by</p>
                    <p className="font-bold">{session.user.name || "OrbitByte user"}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{session.user.email}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right dark:bg-white/5">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Amount Paid</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{inr(receipt.amount)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/10">
                  {receiptFields(receipt).map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-2.5 last:border-0 dark:border-white/5">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{f.label}</span>
                      <span className="text-right text-xs font-semibold">{f.value}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  <p className="font-bold text-slate-700 dark:text-slate-200">OrbitByte</p>
                  <p>Thank you for your business.</p>
                  <p className="mt-1">This receipt was generated automatically. Keep it for your records.</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {receiptLoading && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold shadow dark:bg-slate-900">
            <Clock size={16} className="animate-spin text-slate-400" /> Loading receipt…
          </div>
        </div>
      )}
    </div>
  );
}
