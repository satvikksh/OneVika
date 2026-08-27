"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

type Overview = {
  totalUsers?: number;
  totalCreators?: number;
  totalEarningsGenerated?: number;
  totalWithdrawn?: number;
  pendingWithdrawals?: number;
  completedWithdrawals?: number;
  failedWithdrawals?: number;
  totalEligibleLikes?: number;
};

const filters = ["Today", "7 Days", "30 Days", "3 Months", "1 Year"];

function formatValue(key: string, value?: number) {
  if (key === "totalEarningsGenerated" || key === "totalWithdrawn") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
  }
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function SkeletonCard() {
  return (
    <div className="h-36 animate-pulse rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-white/10" />
      <div className="mt-6 h-4 w-24 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-7 w-32 rounded bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/55 p-8 text-center shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/[0.04]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
        <BarChart3 size={20} />
      </div>
      <h3 className="mt-4 text-base font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("30 Days");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load overview");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const kpis = useMemo(
    () => [
      { label: "Total Users", key: "totalUsers", icon: Users, tone: "from-cyan-400 to-blue-500" },
      { label: "Active Users", key: "activeUsers", icon: Activity, tone: "from-emerald-400 to-teal-500" },
      { label: "Total Posts", key: "totalPosts", icon: FileText, tone: "from-violet-400 to-fuchsia-500" },
      { label: "Total Earnings", key: "totalEarningsGenerated", icon: CircleDollarSign, tone: "from-amber-300 to-orange-500" },
      { label: "Pending Withdrawals", key: "pendingWithdrawals", icon: Wallet, tone: "from-sky-400 to-cyan-500" },
      { label: "Completed Payouts", key: "completedWithdrawals", icon: CheckCircle2, tone: "from-emerald-300 to-lime-500" },
      { label: "Platform Revenue", key: "platformRevenue", icon: TrendingUp, tone: "from-indigo-400 to-cyan-500" },
      { label: "Reports", key: "reports", icon: AlertTriangle, tone: "from-rose-400 to-pink-500" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Operations overview</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Platform command center</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/10">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm ${
                  filter === item ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-bold">{error}</p>
            <button onClick={load} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white">Retry</button>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)
          : kpis.map((item, index) => {
              const Icon = item.icon;
              const value = data[item.key as keyof Overview];
              const available = typeof value === "number";
              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-950/5 backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-950/10 dark:border-white/10 dark:bg-white/[0.07]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${item.tone} text-white shadow-lg`}>
                      <Icon size={21} />
                    </div>
                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:border-white/10 dark:text-slate-400">
                      {available ? "Live" : "Unavailable"}
                    </span>
                  </div>
                  <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-2 text-3xl font-black">{available ? formatValue(item.key, value) : "-"}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-400 dark:text-slate-500">Previous-period comparison unavailable</p>
                </motion.div>
              );
            })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">Analytics</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{filter}</p>
            </div>
            <BarChart3 className="text-cyan-500" />
          </div>
          <div className="mt-5">
            <EmptyPanel title="No time-series data available" description="The current admin APIs return aggregate totals only. Charts will render here when growth, engagement, revenue, and withdrawal series are available." />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <h3 className="text-lg font-black">Recent activity</h3>
          <div className="mt-5">
            <EmptyPanel title="No recent activity feed" description="Audit logs and payout events are available on their dedicated admin pages. A unified activity stream is not exposed by the current APIs." />
          </div>
        </div>
      </section>
    </div>
  );
}
