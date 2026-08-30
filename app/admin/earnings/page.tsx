"use client";

import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, BarChart3, CircleDollarSign, TrendingUp, Users } from "lucide-react";

import { AdminEmptyState } from "../components/AdminEmptyState";

type Overview = {
  totalCreators?: number;
  totalEarningsGenerated?: number;
  totalWithdrawn?: number;
  totalEligibleLikes?: number;
};

type LedgerRow = {
  id: string;
  scope: "like" | "creator";
  type: string;
  status: string;
  amountPaise: number;
  description: string;
  creatorName: string;
  createdAt: string | null;
};

const cards = [
  { label: "Total creator earnings", key: "totalEarningsGenerated", icon: CircleDollarSign, kind: "money" },
  { label: "Paid earnings", key: "totalWithdrawn", icon: TrendingUp, kind: "money" },
  { label: "Top creators counted", key: "totalCreators", icon: Users, kind: "number" },
  { label: "Eligible likes", key: "totalEligibleLikes", icon: BarChart3, kind: "number" },
] as const;

function money(value?: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

function num(value?: number) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function timeAgo(value?: string | null) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(minutes, 0)}m ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AdminEarningsPage() {
  const [data, setData] = useState<Overview>({});
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load earnings");
      setData(payload);
      const walletRes = await fetch("/api/admin/wallet?limit=10", { cache: "no-store" });
      const walletPayload = await walletRes.json().catch(() => ({}));
      if (walletRes.ok && Array.isArray(walletPayload.ledger)) setLedger(walletPayload.ledger);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load earnings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Creator finance</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Earnings</h2>
      </section>
      {error ? <AdminEmptyState icon={CircleDollarSign} title={error} description="Retry loading the existing admin overview endpoint." onRetry={load} /> : null}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-white/75 dark:bg-white/10" />)}</div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const rawValue = data[card.key];
            const value = card.kind === "money" ? money(rawValue) : num(rawValue);
            return (
              <div key={card.key} className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
                <Icon className="text-cyan-500" size={22} />
                <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </div>
            );
          })}
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black">Latest transactions</h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trend and distribution charts live on the Analytics page</p>
        </div>
        <div className="mt-4 space-y-2">
          {ledger.map((entry) => {
            const debit = entry.type === "WITHDRAWAL";
            return (
              <div key={entry.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  {debit ? <ArrowDownCircle size={20} className="mt-0.5 shrink-0 text-rose-400" /> : <ArrowUpCircle size={20} className="mt-0.5 shrink-0 text-emerald-400" />}
                  <div>
                    <p className="text-sm font-black">{entry.creatorName}</p>
                    <p className="mt-1 text-xs text-slate-500">{entry.type} · {entry.status} · {timeAgo(entry.createdAt)}</p>
                  </div>
                </div>
                <p className={`shrink-0 font-black ${debit ? "text-rose-400" : "text-emerald-300"}`}>
                  {debit ? "−" : "+"}{money(Math.abs(entry.amountPaise))}
                </p>
              </div>
            );
          })}
          {ledger.length === 0 && !loading ? <p className="py-8 text-center text-sm text-slate-500">No transactions on record yet.</p> : null}
        </div>
      </section>
    </div>
  );
}