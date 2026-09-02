"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Coins,
  Heart,
  LineChart,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminEmptyState } from "../components/AdminEmptyState";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function inr(value: number) {
  // analytics API returns integer paise; convert to rupees for display.
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    (value || 0) / 100
  );
}

function num(value?: number | null) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function fmtTick(key: string) {
  if (!key) return "";
  if (key.length === 7) {
    const [year, month] = key.split("-").map(Number);
    return `${MONTHS[(month || 1) - 1]} ’${String(year).slice(2)}`;
  }
  const [, month, day] = key.split("-").map(Number);
  return `${day} ${MONTHS[(month || 1) - 1]}`;
}

function statusBadge(status?: string | null) {
  const map: Record<string, string> = {
    OPEN: "bg-emerald-500/15 text-emerald-300",
    CALCULATING: "bg-sky-500/15 text-sky-300",
    UNDER_REVIEW: "bg-amber-500/15 text-amber-300",
    FINALIZED: "bg-cyan-500/15 text-cyan-300",
    PAID: "bg-violet-500/15 text-violet-300",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${map[status ?? ""] ?? "bg-white/10 text-slate-400"}`}>
      {status ?? "—"}
    </span>
  );
}

const REVENUE_STATE_COLORS: Record<string, string> = {
  ESTIMATED: "bg-sky-500/15 text-sky-300",
  PENDING_REVIEW: "bg-amber-500/15 text-amber-300",
  FINALIZED: "bg-cyan-500/15 text-cyan-300",
  RELEASED: "bg-teal-500/15 text-teal-300",
  WITHDRAWN: "bg-violet-500/15 text-violet-300",
  FROZEN: "bg-rose-500/15 text-rose-300",
  REJECTED: "bg-rose-500/15 text-rose-300",
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "3m", label: "3 Months" },
  { key: "1y", label: "1 Year" },
];

const TOP_EARNER_COLORS = ["#22d3ee", "#8b5cf6", "#f59e0b", "#34d399", "#f472b6"];
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: 12,
  fontSize: 12,
  color: "#e2e8f0",
};

type Point = { key: string; earnedPaise: number; withdrawnPaise: number };

type CycleRow = {
  id: string;
  label: string;
  status: string;
  poolPaise: number;
  releasedPaise: number;
  eligibleCreators: number;
  eligibleScores: number;
  totalQualifiedViews: number;
};

type CreatorRow = {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  cycleLabel: string;
  qualifiedViews: number;
  qualifiedWatchMs: number;
  completedViews: number;
  score: number;
  revenuePaise: number;
  revenueState: string;
  ineligibilityReasons: string[];
};

type TopEarner = {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  earnedPaise: number;
};

type AnalyticsData = {
  range: { key: string; label: string; granularity: "day" | "month" };
  summary: {
    earningsPaise: number;
    withdrawnPaise: number;
    eligibleLikes: number;
    releasedPaise: number;
    poolPaise: number;
    activeCycleLabel: string | null;
    activeCycleStatus: string | null;
  };
  dailySeries: Point[];
  cycleSeries: CycleRow[];
  creatorRows: CreatorRow[];
  topEarners: TopEarner[];
};

function ChartShell({
  title,
  icon: Icon,
  children,
  empty,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black">{title}</h3>
        <Icon className="text-cyan-500" size={18} />
      </div>
      {empty ? (
        <p className="py-10 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="mt-4 h-64">{children}</div>
      )}
    </section>
  );
}

export default function AdminAnalyticsPage() {
  const [filter, setFilter] = useState("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (range: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/analytics?range=${encodeURIComponent(range)}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load analytics");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("30d");
  }, [load]);

  const summary = data?.summary;
  const seriesHasData = (data?.dailySeries ?? []).some((point) => point.earnedPaise > 0 || point.withdrawnPaise > 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Platform intelligence</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Analytics</h2>
        </div>
        <div className="flex flex-wrap rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/10">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setFilter(item.key);
                void load(item.key);
              }}
              className={`rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm ${filter === item.key ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {error ? <AdminEmptyState icon={BarChart3} title={error} description="Retry or check the admin analytics API route." onRetry={() => void load(filter)} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-white/75 dark:bg-white/10" />)
        ) : (
          [
            { label: "Earnings in range", value: inr(summary?.earningsPaise ?? 0), icon: TrendingUp },
            { label: "Withdrawn in range", value: inr(summary?.withdrawnPaise ?? 0), icon: Activity },
            { label: "Eligible likes", value: num(summary?.eligibleLikes), icon: Heart },
            {
              label: "Creator revenue pool",
              value: inr(summary?.poolPaise ?? 0),
              icon: Coins,
              sub: `${summary?.activeCycleLabel ?? "No active cycle"} · ${inr(summary?.releasedPaise ?? 0)} released lifetime`,
            },
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

      <ChartShell title={`Earnings & withdrawals · ${data?.range.label ?? filter}`} icon={LineChart} empty={loading && !data ? undefined : !seriesHasData ? "No earnings or withdrawals in this range yet." : undefined}>
        {seriesHasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.dailySeries ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="earned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="withdrawn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
              <XAxis
                dataKey="key"
                tickFormatter={(value) => fmtTick(String(value))}
                tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={18}
              />
              <YAxis
                tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `₹${Number(value) >= 1000 ? `${Number(value) / 1000}k` : Number(value)}`}
                width={46}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} formatter={(value) => inr(Number(value ?? 0))} />
              <Area type="monotone" dataKey="earnedPaise" name="Earnings" stroke="#22d3ee" strokeWidth={2.5} fill="url(#earned)" />
              <Area type="monotone" dataKey="withdrawnPaise" name="Withdrawals" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#withdrawn)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </ChartShell>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartShell title="Revenue pool by earning cycle" icon={BarChart3} empty={loading && !data ? undefined : (data?.cycleSeries ?? []).length === 0 ? "No earning cycles yet." : undefined}>
          {(data?.cycleSeries ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.cycleSeries ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={46} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => inr(Number(value ?? 0))} />
                <Bar dataKey="poolPaise" name="Pool" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="releasedPaise" name="Released" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </ChartShell>

        <ChartShell title="Top creators by lifetime earnings" icon={TrendingUp} empty={loading && !data ? undefined : (data?.topEarners ?? []).length === 0 ? "No creator earnings on record yet." : undefined}>
          {(data?.topEarners ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.topEarners ?? []}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${Number(value) >= 1000 ? `${Number(value) / 1000}k` : Number(value)}`} />
                <YAxis type="category" dataKey="creatorName" width={140} tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => inr(Number(value ?? 0))} />
                <Bar dataKey="earnedPaise" name="Earned" radius={[0, 6, 6, 0]}>
                  {(data?.topEarners ?? []).map((creator, index) => (
                    <Cell key={creator.creatorId} fill={TOP_EARNER_COLORS[index % TOP_EARNER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </ChartShell>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Creator performance</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Qualified engagement from creator revenue score snapshots</p>
          </div>
          {data?.range ? statusBadge(data.range.label) : null}
        </div>
        <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/80 text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Cycle</th>
                <th className="px-4 py-3 text-right">Qualified views</th>
                <th className="px-4 py-3 text-right">Watch time</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {(data?.creatorRows ?? []).map((row, index) => (
                <tr key={`${row.creatorId}-${index}`} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <p className="font-black">{row.creatorName}</p>
                    <p className="text-xs text-slate-500">{row.creatorEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{row.cycleLabel}</td>
                  <td className="px-4 py-3 text-right font-bold">{num(row.qualifiedViews)}</td>
                  <td className="px-4 py-3 text-right font-bold">{(row.qualifiedWatchMs / 3600000).toFixed(1)}h</td>
                  <td className="px-4 py-3 text-right font-black text-fuchsia-300">{row.score.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-300">{inr(row.revenuePaise)}</td>
                  <td className="px-4 py-3 text-right">{statusBadgeReuse(row.revenueState)}</td>
                </tr>
              ))}
              {(data?.creatorRows ?? []).length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No creator score snapshots yet. Snapshots appear once the monthly earning cycle is calculated.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 lg:hidden">
          {(data?.creatorRows ?? []).map((row, index) => (
            <div key={`${row.creatorId}-${index}`} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black">{row.creatorName}</p>
                {statusBadgeReuse(row.revenueState)}
              </div>
              <p className="mt-1 text-xs text-slate-500">{row.creatorEmail} · Cycle {row.cycleLabel}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                <p>{num(row.qualifiedViews)}<br />qualified views</p>
                <p>{(row.qualifiedWatchMs / 3600000).toFixed(1)}h<br />watch time</p>
                <p>Score <span className="font-black text-fuchsia-300">{row.score.toFixed(1)}</span><br />Revision {inr(row.revenuePaise)}</p>
              </div>
            </div>
          ))}
          {(data?.creatorRows ?? []).length === 0 && !loading ? <p className="py-8 text-center text-sm text-slate-500">No creator score snapshots yet.</p> : null}
        </div>
      </section>
    </div>
  );

  function statusBadgeReuse(status: string) {
    return (
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${REVENUE_STATE_COLORS[status] ?? "bg-white/10 text-slate-400"}`}>
        {status}
      </span>
    );
  }
}