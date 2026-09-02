"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Landmark,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  INITIATED: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PROCESSING: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  VERIFICATION_REQUIRED: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  USER_DROPPED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  CANCELLED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  REFUNDED: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  PARTIALLY_REFUNDED: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

function inr(value?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value || 0
  );
}

function fmt(value?: number | null) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function paiseInr(value?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    (value || 0) / 100
  );
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

interface PaymentRow {
  _id: string;
  transactionId: string;
  orderId?: string | null;
  userId?: string | null;
  email?: string;
  name?: string;
  amount?: number;
  amountPaise?: number;
  currency?: string;
  purpose?: string;
  paymentMethod?: string | null;
  paymentMethodType?: string | null;
  provider?: string | null;
  providerOrderId?: string;
  providerPaymentId?: string;
  plan?: { key: string; name?: string } | null;
  refund?: { status?: string } | null;
  status: string;
  createdAt?: string;
  completedAt?: string;
  failedAt?: string;
}

interface AnalyticsSeries {
  premiumRevenue: number[];
  premiumRevenuePaise: number[];
  purchases: number[];
  successful: number[];
  failed: number[];
  refunds: number[];
  refundAmount: number[];
}

interface AnalyticsSummary {
  totalCompleted: number;
  totalFailed: number;
  totalRefunded: number;
  cancelled: number;
  activeMembers: number;
  expiredMembers: number;
  totalMembers: number;
}

interface PaymentsAnalytics {
  labels: string[];
  series: AnalyticsSeries;
  summary: AnalyticsSummary;
}

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [status, setStatus] = useState("");
  const [purpose, setPurpose] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [stats, setStats] = useState({
    totalVolume: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    premiumRevenue30d: 0,
    premiumPurchases: 0,
    activePremiumMembers: 0,
  });
  const [table, setTable] = useState({
    data: [] as PaymentRow[],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [analyticsRange, setAnalyticsRange] = useState("30d");
  const [analytics, setAnalytics] = useState<PaymentsAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sortBy", sortBy);
    params.set("order", order);
    if (status) params.set("status", status);
    if (purpose) params.set("purpose", purpose);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (q) params.set("q", q);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (amountMin) params.set("amountMin", amountMin);
    if (amountMax) params.set("amountMax", amountMax);
    return params.toString();
  }, [page, pageSize, sortBy, order, status, purpose, paymentMethod, q, fromDate, toDate, amountMin, amountMax]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payments?${buildQuery()}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load payments");
      setStats(payload.stats);
      setTable(payload.table);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payments");
      console.error("ADMIN PAYMENTS LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/analytics?range=${analyticsRange}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load analytics");
      setAnalytics(payload);
    } catch (err) {
      console.error("PAYMENT ANALYTICS LOAD ERROR:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsRange]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setOrder("desc");
    }
    setPage(1);
  };

  const handleAction = async (row: PaymentRow, action: "verify" | "fail") => {
    setBusyId(row._id);
    setActionMsg("");
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, transactionId: row._id, reason: "admin_manual" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Action failed");
      setActionMsg(`${action === "verify" ? "Payment verified" : "Payment marked failed"} successfully`);
      void loadData();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const statsCards = [
    { label: "Total Payment Volume", value: inr(stats.totalVolume), icon: CircleDollarSign, tone: "from-emerald-400 to-teal-500" },
    { label: "Successful Payments", value: fmt(stats.successfulPayments), icon: CheckCircle2, tone: "from-emerald-400 to-blue-500" },
    { label: "Pending Payments", value: fmt(stats.pendingPayments), icon: Clock, tone: "from-amber-500 to-orange-500" },
    { label: "Failed Payments", value: fmt(stats.failedPayments), icon: XCircle, tone: "from-rose-500 to-red-500" },
    { label: "Premium Revenue (30d)", value: inr(stats.premiumRevenue30d), icon: TrendingUp, tone: "from-violet-500 to-pink-500" },
    { label: "Premium Purchases", value: fmt(stats.premiumPurchases), icon: ShieldCheck, tone: "from-cyan-500 to-teal-500" },
    { label: "Active Premium Members", value: fmt(stats.activePremiumMembers), icon: Landmark, tone: "from-slate-500 to-indigo-500" },
  ];

  const renderBarChart = (labels: string[], series: number[], color: string, format: (v: number) => string) => {
    const max = Math.max(1, ...series);
    return (
      <div className="flex h-40 items-end gap-1">
        {series.map((v, i) => {
          const h = Math.round((v / max) * 160);
          return (
            <div key={i} title={`${labels[i]}: ${format(v)}`} className="group relative flex-1">
              <div className="flex h-40 items-end">
                <div className={`w-full rounded-t ${color}`} style={{ height: `${Math.max(h, 2)}px` }} />
              </div>
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 dark:bg-white dark:text-slate-900">
                {format(v)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const rangeOptions = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "3m", label: "3 Months" },
    { key: "1y", label: "1 Year" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Payment Management</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          View and manage all OrbitByte payment transactions.
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

      {/* Analytics charts */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div>
          <h3 className="text-base font-black">Payment Analytics</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Revenue, purchases, and outcomes over time</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
          {rangeOptions.map((r) => (
            <button
              key={r.key}
              onClick={() => setAnalyticsRange(r.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                analyticsRange === r.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {analyticsLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          Loading analytics…
        </div>
      ) : analytics ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <p className="mb-4 text-sm font-bold">Premium Revenue</p>
            {renderBarChart(analytics.labels, analytics.series.premiumRevenuePaise, "bg-violet-400", paiseInr)}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <p className="mb-4 text-sm font-bold">Purchases</p>
            {renderBarChart(analytics.labels, analytics.series.purchases, "bg-blue-500", fmt)}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <p className="mb-4 text-sm font-bold">Successful vs Failed (green / red)</p>
            <div className="flex items-end gap-1">
              <div className="flex-1">
                <div className="flex h-40 items-end gap-px">
                  {analytics.labels.map((l: string, i: number) => {
                    const max = Math.max(1, ...analytics.series.successful, ...analytics.series.failed);
                    const s = analytics.series.successful[i] || 0;
                    const f = analytics.series.failed[i] || 0;
                    const total = s + f;
                    const barH = Math.max((total / max) * 160, 2);
                    return (
                      <div key={l} title={`${l}: ${s} ok / ${f} failed`} className="relative flex-1">
                        <div className="flex flex-col-reverse overflow-hidden rounded-sm" style={{ height: `${barH}px` }}>
                          {total > 0 && (
                            <>
                              <div className="w-full bg-emerald-400" style={{ height: `${(s / total) * 100}%` }} />
                              <div className="w-full bg-rose-500" style={{ height: `${(f / total) * 100}%` }} />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <p className="mb-4 text-sm font-bold">Refunds (count)</p>
            {renderBarChart(analytics.labels, analytics.series.refunds, "bg-rose-400", fmt)}
          </div>
        </div>
      ) : null}

      {/* Membership summary strip */}
      {analytics && !analyticsLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Completed Payments", value: fmt(analytics.summary.totalCompleted), tone: "text-emerald-600 dark:text-emerald-400" },
            { label: "Failed Payments", value: fmt(analytics.summary.totalFailed), tone: "text-rose-600 dark:text-rose-400" },
            { label: "Refunded Payments", value: fmt(analytics.summary.totalRefunded), tone: "text-amber-600 dark:text-amber-400" },
            { label: "Cancelled Payments", value: fmt(analytics.summary.cancelled), tone: "text-slate-600 dark:text-slate-400" },
            { label: "Active Premium Members", value: fmt(analytics.summary.activeMembers), tone: "text-blue-600 dark:text-blue-400" },
            { label: "Expired Premium Members", value: fmt(analytics.summary.expiredMembers), tone: "text-orange-600 dark:text-orange-400" },
            { label: "Total Premium Tracked", value: fmt(analytics.summary.totalMembers), tone: "text-violet-600 dark:text-violet-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className={`text-2xl font-black ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((c) => (
          <div
            key={c.label}
            className={`rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] bg-gradient-to-br ${c.tone} bg-clip-padding`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg">
                <c.icon size={20} />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{c.label}</p>
                <p className="text-xl font-black">{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search transaction, order, email, user…"
              className="w-full rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          >
            <option value="">All statuses</option>
            {["COMPLETED", "INITIATED", "PENDING", "PROCESSING", "VERIFICATION_REQUIRED", "FAILED", "USER_DROPPED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={purpose}
            onChange={(e) => { setPurpose(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          >
            <option value="">All purposes</option>
            {["membership", "wallet_credit", "refund", "other"].map((p) => (
              <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          >
            <option value="">All methods</option>
            {["cashfree", "upi", "bank_transfer", "card", "wallet", "manual"].map((m) => (
              <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          />
          <input
            type="number"
            value={amountMin}
            onChange={(e) => { setAmountMin(e.target.value); setPage(1); }}
            placeholder="Min ₹"
            className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          />
          <input
            type="number"
            value={amountMax}
            onChange={(e) => { setAmountMax(e.target.value); setPage(1); }}
            placeholder="Max ₹"
            className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          />
          <button
            onClick={() => { setPage(1); void loadData(); }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]">
              <tr>
                {[["transactionId", "Transaction"], ["orderId", "Order"], ["name", "User"], ["", "Plan"], ["amount", "Amount"], ["paymentMethodType", "Provider / Method"], ["purpose", "Purpose"], ["status", "Status"], ["createdAt", "Created"], ["completedAt", "Completed"], ["", "Actions"]].map(([key, label]) => (
                  <th
                    key={key || label}
                    onClick={key ? () => handleSort(key) : undefined}
                    className={`px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 ${key ? "cursor-pointer hover:text-blue-600" : ""}`}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {key && <ArrowDownUp size={12} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">Loading payments…</td></tr>
              ) : table.data.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">No payments found</td></tr>
              ) : (
                table.data.map((row) => (
                  <tr key={row._id} className="border-b border-slate-100 last:border-0 dark:border-white/5 hover:bg-slate-50/60 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-mono text-xs">{row.transactionId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{row.orderId || "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.name || "Unknown"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.plan ? (
                        <>
                          <p className="font-semibold capitalize">{row.plan.name || row.plan.key}</p>
                          {row.plan.key && row.plan.name !== row.plan.key ? (
                            <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{row.plan.key}</p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold">{inr(row.amount)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        row.provider?.toLowerCase() === "cashfree"
                          ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
                          : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                      }`}>
                        {row.provider === "cashfree" ? "Cashfree" : row.provider?.toUpperCase?.() || "—"}
                        {row.paymentMethodType && row.provider?.toLowerCase() !== row.paymentMethodType?.toLowerCase()
                          ? ` · ${row.paymentMethodType}`
                          : ""}
                      </span>
                      {(row.providerOrderId || row.providerPaymentId) ? (
                        <p className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {row.providerOrderId ? `ord: ${row.providerOrderId}` : ""}
                          {row.providerOrderId && row.providerPaymentId ? " · " : ""}
                          {row.providerPaymentId ? `ref: ${row.providerPaymentId}` : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{row.purpose?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(row.completedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {["INITIATED", "PENDING", "PROCESSING", "VERIFICATION_REQUIRED"].includes(row.status) && (
                          <>
                            <button
                              disabled={busyId === row._id}
                              onClick={() => void handleAction(row, "verify")}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} /> Verify
                            </button>
                            <button
                              disabled={busyId === row._id}
                              onClick={() => void handleAction(row, "fail")}
                              className="flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              <XCircle size={12} /> Fail
                            </button>
                          </>
                        )}
                        {row.refund && (
                          <span className="text-xs text-violet-600 dark:text-violet-300">{row.refund.status}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>
              {table.total === 0 ? "0" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, table.total)}`} of {table.total}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:border-white/10"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm">Page {page} of {Math.max(1, table.totalPages)}</span>
            <button
              disabled={page >= table.totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:border-white/10"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
