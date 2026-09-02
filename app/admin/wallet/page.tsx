"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDollarSign,
  Landmark,
  Loader2,
  Search,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { AdminEmptyState } from "../components/AdminEmptyState";

function inr(value: number) {
  // value is integer paise; convert to rupees for display exactly once.
  const rupees = (value || 0) / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(rupees);
}

function num(value?: number | null) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function timeAgo(value?: string | null) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const TYPE_COLORS: Record<string, string> = {
  EARNING: "bg-emerald-500/15 text-emerald-300",
  RELEASE: "bg-teal-500/15 text-teal-300",
  WITHDRAWAL: "bg-rose-500/15 text-rose-300",
  REFUND: "bg-amber-500/15 text-amber-300",
  ADJUSTMENT: "bg-sky-500/15 text-sky-300",
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-emerald-500/15 text-emerald-300",
  PENDING: "bg-amber-500/15 text-amber-300",
  FAILED: "bg-rose-500/15 text-rose-300",
  REVERSED: "bg-violet-500/15 text-violet-300",
};

function badge(map: Record<string, string>, value?: string | null) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${map[value ?? ""] ?? "bg-white/10 text-slate-400"}`}>
      {value ?? "—"}
    </span>
  );
}

type Summary = {
  totalEarningsPaise: number;
  totalWithdrawnPaise: number;
  totalAvailablePaise: number;
  totalHeldPaise: number;
  totalRefundedPaise: number;
  walletsWithBalance: number;
  earningCreators: number;
  totalWallets: number;
  pendingWithdrawals: number;
};

type WalletRow = {
  id: string;
  userId: string;
  creatorName: string;
  creatorEmail: string;
  availablePaise: number;
  earnedPaise: number;
  withdrawnPaise: number;
  updatedAt: string | null;
};

type LedgerRow = {
  id: string;
  scope: "like" | "creator";
  type: string;
  status: string;
  amountPaise: number;
  description: string;
  creatorId: string;
  creatorName: string;
  createdAt: string | null;
};

type WalletData = {
  summary: Summary;
  wallets: WalletRow[];
  walletsTotal: number;
  ledger: LedgerRow[];
  pagination: { page: number; limit: number; total: number };
};

export default function AdminWalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (search: string, pageNumber: number) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(pageNumber), limit: "10" });
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/wallet?${params.toString()}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load wallet");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("", 1);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil((data?.walletsTotal ?? 0) / (data?.pagination.limit ?? 10)));
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Financial operations</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Wallet</h2>
      </section>

      {error ? <AdminEmptyState icon={WalletIcon} title={error} description="Retry or check the admin wallet API route." onRetry={() => void load(q, page)} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-white/75 dark:bg-white/10" />)
        ) : (
          [
            { label: "Total earnings issued", value: inr(summary?.totalEarningsPaise ?? 0), icon: CircleDollarSign },
            { label: "Total withdrawn", value: inr(summary?.totalWithdrawnPaise ?? 0), icon: Landmark },
            { label: "Available creator balances", value: inr(summary?.totalAvailablePaise ?? 0), icon: WalletIcon, sub: `${num(summary?.walletsWithBalance)} wallets with balance` },
            { label: "Held in pending withdrawals", value: inr(summary?.totalHeldPaise ?? 0), icon: ArrowUpCircle, sub: `${num(summary?.pendingWithdrawals)} pending` },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
                <Icon className="text-cyan-500" size={22} />
                <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-3xl font-black">{card.value}</p>
                {card.sub ? <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">{card.sub}</p> : null}
              </div>
            );
          })
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Creator wallets</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{num(data?.walletsTotal)} wallets · {num(summary?.earningCreators)} earning creators · {num(summary?.pendingWithdrawals)} pending withdrawals</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              void load(q, 1);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search creator by name or email"
                className="w-64 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm outline-none placeholder:text-slate-400 focus:border-cyan-400 dark:border-white/10 dark:bg-white/10"
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                    void load("", 1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-0.5 text-slate-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950">
              Search
            </button>
          </form>
        </div>

        {loading && data ? <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Loading wallets…</p> : null}

        <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/80 text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3 text-right">Earned</th>
                <th className="px-4 py-3 text-right">Withdrawn</th>
                <th className="px-4 py-3 text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {(data?.wallets ?? []).map((wallet) => (
                <tr key={wallet.id} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <p className="font-black">{wallet.creatorName}</p>
                    <p className="text-xs text-slate-500">{wallet.creatorEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-emerald-300">{inr(wallet.availablePaise)}</td>
                  <td className="px-4 py-3 text-right font-bold">{inr(wallet.earnedPaise)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-400">{inr(wallet.withdrawnPaise)}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{timeAgo(wallet.updatedAt)}</td>
                </tr>
              ))}
              {(data?.wallets ?? []).length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">No creator wallets found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 md:hidden">
          {(data?.wallets ?? []).map((wallet) => (
            <div key={wallet.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black">{wallet.creatorName}</p>
                <p className="font-black text-emerald-300">{inr(wallet.availablePaise)}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">{wallet.creatorEmail}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <p>Earned <span className="font-bold text-white">{inr(wallet.earnedPaise)}</span></p>
                <p>Withdrawn <span className="font-bold text-white">{inr(wallet.withdrawnPaise)}</span></p>
              </div>
            </div>
          ))}
          {(data?.wallets ?? []).length === 0 && !loading ? <p className="py-8 text-center text-sm text-slate-500">No creator wallets found.</p> : null}
        </div>

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  void load(q, next);
                }}
                disabled={page <= 1 || loading}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  const next = Math.min(totalPages, page + 1);
                  setPage(next);
                  void load(q, next);
                }}
                disabled={page >= totalPages || loading}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black">Recent transactions</h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Latest combined ledger across like earnings and creator revenue</p>
        </div>
        <div className="mt-4 space-y-2">
          {(data?.ledger ?? []).map((entry) => {
            const debit = entry.type === "WITHDRAWAL";
            const amount = Math.abs(entry.amountPaise);
            return (
              <div key={entry.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  {debit ? <ArrowDownCircle size={20} className="mt-0.5 shrink-0 text-rose-400" /> : <ArrowUpCircle size={20} className="mt-0.5 shrink-0 text-emerald-400" />}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black">{entry.creatorName}</p>
                      {badge(TYPE_COLORS, entry.type)}
                      {badge(STATUS_COLORS, entry.status)}
                      {entry.scope === "creator" ? <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-cyan-300">Creator revenue</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{entry.description || (entry.type === "EARNING" ? "Eligible like earning" : entry.type)} · {timeAgo(entry.createdAt)}</p>
                  </div>
                </div>
                <p className={`shrink-0 font-black sm:text-right ${debit ? "text-rose-400" : "text-emerald-300"}`}>
                  {debit ? "−" : "+"}{inr(amount)}
                </p>
              </div>
            );
          })}
          {(data?.ledger ?? []).length === 0 && !loading ? <p className="py-8 text-center text-sm text-slate-500">No transactions on record yet.</p> : null}
        </div>
      </section>
    </div>
  );
}