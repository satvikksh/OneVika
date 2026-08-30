"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BadgeCheck,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Clock,
  Coins,
  Crown,
  FileText,
  Film,
  Flag,
  FolderKanban,
  Heart,
  Landmark,
  MessageSquare,
  RefreshCw,
  Scale,
  Settings2,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Users2,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { QUICK_ACTIONS } from "../components/QuickActions";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "3m", label: "3 Months" },
  { key: "1y", label: "1 Year" },
];

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: 12,
  fontSize: 12,
  color: "#e2e8f0",
};

function inr(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

function num(value?: number | null) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function fmtTick(key: string) {
  if (!key) return "";
  if (key.includes(":")) return key;
  if (key.length === 7) {
    const [year, month] = key.split("-").map(Number);
    return `${MONTHS[(month || 1) - 1]} ’${String(year).slice(2)}`;
  }
  if (key.length === 10) {
    const [, month, day] = key.split("-").map(Number);
    return `${day} ${MONTHS[(month || 1) - 1]}`;
  }
  return key;
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ---------- shared types (mirror of /api/admin/dashboard) ----------

type Granule = "hour" | "day" | "week" | "month";
type Pct = { current: number; previous: number; pct: number | null };
type Point = { key: string; label: string; value: number };

type DashboardData = {
  range: { key: string; label: string; granule: Granule; fromIso: string; prevFromIso: string; toIso: string };
  cards: {
    totalUsers: number;
    activeUsers: number;
    activeUsersPrev: number;
    newUsers: number;
    newUsersPrev: number;
    totalPosts: number;
    removedPosts: number;
    totalVideos: number;
    totalProjects: number;
    totalComments: number;
    totalLikes: number;
    totalShares: number;
    totalFollowers: number;
    premium: number;
    verified: number;
    suspended: number;
    banned: number;
    reports: number;
    pendingReports: number;
  };
  changes: Record<string, Pct>;
  revenue: {
    platformRevenue: number;
    creatorPool: number;
    creatorEarnings: number;
    walletEarned: number;
    withdrawn: number;
    withdrawnCount: number;
    pending: number;
    available: number;
    period: number;
    periodPrev: number;
    likeEarnings: number;
    released: number;
    backfilled: number;
  };
  content: {
    posts: number;
    videos: number;
    removed: number;
    projects: number;
    likes: number;
    comments: number;
    shares: number;
    topContent: Array<{ id: string; preview: string; authorName: string; likes: number; comments: number; createdAt: string }>;
  };
  moderation: { total: number; pending: number; reviewing: number; dismissed: number; resolved: number; removedContent: number; suspended: number; banned: number };
  withdrawals: {
    total: number;
    totalAmount: number;
    completedPeriod: number;
    byStatus: Record<string, { count: number; paise: number }>;
  };
  creators: {
    pool: number;
    activeCycleLabel: string;
    activeCycleStatus: string;
    eligibleCreators: number;
    totalScores: number;
    totalQualifiedViews: number;
    estimatedEarnings: number;
    finalizedEarnings: number;
    released: number;
    topCreators: Record<string, Array<{ creatorId: string; name: string; avatar: string; score: number; qualifiedViews: number; engagement: number; revenuePaise: number }>>;
  };
  engagement: { likes: number; likesPrev: number; comments: number; commentsPrev: number; shares: number; sharesPrev: number };
  series: {
    users: Point[];
    active: Point[];
    content: Array<{ key: string; posts: number; videos: number }>;
    projects: Point[];
    engagement: { likes: Point[]; comments: Point[]; shares: Point[] };
    revenue: Point[];
    creator: Point[];
    withdrawals: Point[];
    reports: Point[];
  };
  activity: Array<{ type: string; title: string; ref: string; timestamp: string; status: string }>;
};

// ---------- presentational helpers ----------

function DeltaBadge({ value, suffix, showZero = true }: { value?: Pct | null; suffix?: string; showZero?: boolean }) {
  if (!value) return <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">No previous-period data</span>;
  const pct = value.pct;
  const suffixText = suffix ? ` ${suffix}` : "";
  if (pct === null) {
    return value.current > 0 ? (
      <span className="text-xs font-semibold text-cyan-500">New in period</span>
    ) : value.previous > 0 ? (
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">No activity this period</span>
    ) : (
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">No previous-period data</span>
    );
  }
  if (pct === 0 && !showZero) {
    return <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Flat vs previous period</span>;
  }
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-black ${up ? "text-emerald-500" : "text-rose-500"}`}>
      <Icon size={13} />
      {`${Math.abs(pct).toFixed(1)}%${suffixText}`}
      <span className="font-semibold text-slate-400 dark:text-slate-500">vs prev</span>
    </span>
  );
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

function Card({
  icon: Icon,
  label,
  value,
  money = false,
  delta,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  money?: boolean;
  delta?: Pct | null;
  sub?: string;
  tone: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-950/5 backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-950/10 dark:border-white/10 dark:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}>
          <Icon size={21} />
        </div>
        <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-black text-emerald-500 dark:border-white/10">Live</span>
      </div>
      <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-black sm:text-3xl">{money ? inr(value) : num(value)}</p>
      <div className="mt-3 min-h-[18px]">
        {delta ? <DeltaBadge value={delta} /> : sub ? <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{sub}</p> : null}
      </div>
    </motion.div>
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950/5 text-cyan-600 dark:bg-white/10 dark:text-cyan-300">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="text-lg font-black">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black sm:text-base">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        <BarChart3 className="shrink-0 text-cyan-500" size={18} />
      </div>
      <div className="mt-4 h-60">
        {empty ? <p className="grid h-full place-items-center text-center text-sm text-slate-500">{empty}</p> : children}
      </div>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]`}>
      <p className={`text-2xl font-black ${tone}`}>{num(value)}</p>
      <p className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function MoneyStat({ label, value, hint, tone = "text-slate-950 dark:text-white" }: { label: string; value: number; hint?: string; tone?: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black sm:text-2xl ${tone}`}>{inr(value)}</p>
      {hint ? <p className="mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{hint}</p> : null}
    </div>
  );
}

function CreatorList({
  rows,
  valueKey,
  format,
}: {
  rows: Array<{ creatorId: string; name: string; avatar: string } & Record<string, unknown>>;
  valueKey: string;
  format: (value: number) => string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No score snapshots yet for this cycle.</p>;
  }
  return (
    <ol className="space-y-2.5">
      {rows.slice(0, 5).map((row, index) => (
        <li key={row.creatorId} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {index + 1}
          </span>
          {row.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(row.avatar)} alt={String(row.name)} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-xs font-black text-cyan-600 dark:text-cyan-300">
              {String(row.name).slice(0, 2).toUpperCase()}
            </span>
          )}
          <p className="min-w-0 flex-1 truncate text-sm font-black">{String(row.name)}</p>
          <p className="text-sm font-black text-fuchsia-300">{format(Number(row[valueKey] ?? 0))}</p>
        </li>
      ))}
    </ol>
  );
}

const ACTIVITY_META: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }> = {
  registration: { icon: UserPlus, tone: "bg-cyan-500/15 text-cyan-500" },
  post: { icon: FileText, tone: "bg-violet-500/15 text-violet-400" },
  video: { icon: Film, tone: "bg-fuchsia-500/15 text-fuchsia-400" },
  report: { icon: Flag, tone: "bg-amber-500/15 text-amber-500" },
  admin: { icon: ShieldCheck, tone: "bg-slate-500/15 text-slate-400" },
  withdrawal: { icon: Landmark, tone: "bg-emerald-500/15 text-emerald-500" },
  earnings: { icon: Coins, tone: "bg-teal-500/15 text-teal-400" },
  project: { icon: FolderKanban, tone: "bg-indigo-500/15 text-indigo-400" },
};

// ---------- page ----------

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("30d");

  const load = useCallback(async (range: string, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/dashboard?range=${encodeURIComponent(range)}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load dashboard");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load("30d");
  }, [load]);

  const changes = useMemo(() => data?.changes ?? {}, [data]);
  const series = useMemo(() => data?.series, [data]);

  const chartHasData = (points?: Point[]) => (points ?? []).some((point) => (point.value ?? 0) > 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Operations overview</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Platform command center</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
            {data ? `${data.range.label} · live data from OrbitByte's databases` : "Loading live platform data…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/10">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setFilter(item.key);
                  void load(item.key);
                }}
                className={`rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm ${
                  filter === item.key ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load(filter, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60 dark:border-white/10 dark:bg-white/10"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-bold">{error}</p>
            <button onClick={() => void load(filter)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white">Retry</button>
          </div>
        </div>
      ) : null}

      {/* ---------- 1. OVERVIEW CARDS ---------- */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Platform overview</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading && !data
            ? Array.from({ length: 12 }).map((_, index) => <SkeletonCard key={index} />)
            : [
                { label: "Total Users", value: data?.cards.totalUsers ?? 0, icon: Users, tone: "from-cyan-400 to-blue-500", sub: "All registered accounts" },
                { label: "Active Users", value: data?.cards.activeUsers ?? 0, icon: Activity, tone: "from-emerald-400 to-teal-500", delta: changes.activeUsers },
                { label: "New Users", value: data?.cards.newUsers ?? 0, icon: UserPlus, tone: "from-sky-400 to-cyan-500", delta: changes.users, sub: "this period" },
                { label: "Total Posts", value: data?.cards.totalPosts ?? 0, icon: FileText, tone: "from-violet-400 to-fuchsia-500", sub: "Posted on OrbitByte" },
                { label: "Videos / Reels", value: data?.cards.totalVideos ?? 0, icon: Film, tone: "from-fuchsia-400 to-pink-500", delta: changes.videos },
                { label: "Total Projects", value: data?.cards.totalProjects ?? 0, icon: FolderKanban, tone: "from-indigo-400 to-violet-500", delta: changes.projects },
                { label: "Total Comments", value: data?.cards.totalComments ?? 0, icon: MessageSquare, tone: "from-teal-400 to-emerald-500", delta: changes.comments },
                { label: "Total Likes", value: data?.cards.totalLikes ?? 0, icon: Heart, tone: "from-rose-400 to-red-500", sub: "Across all posts" },
                { label: "Total Shares", value: data?.cards.totalShares ?? 0, icon: Share2, tone: "from-amber-400 to-orange-500", sub: "Qualified shares" },
                { label: "Connections", value: data?.cards.totalFollowers ?? 0, icon: Users2, tone: "from-cyan-400 to-blue-500", sub: "Follows across users" },
                { label: "Premium Members", value: data?.cards.premium ?? 0, icon: Crown, tone: "from-amber-300 to-yellow-500", sub: "Active membership" },
                { label: "Verified Users", value: data?.cards.verified ?? 0, icon: BadgeCheck, tone: "from-sky-400 to-cyan-500", sub: "Verified accounts" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <Card
                    key={card.label}
                    icon={Icon}
                    label={card.label}
                    value={card.value}
                    tone={card.tone}
                    delta={card.delta ?? null}
                    sub={card.sub}
                  />
                );
              })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading && !data
            ? Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)
            : [
                { label: "Platform Revenue", value: data?.revenue.platformRevenue ?? 0, money: true, icon: TrendingUp, tone: "from-indigo-400 to-cyan-500", delta: changes.revenue },
                { label: "Creator Revenue Pool", value: data?.revenue.creatorPool ?? 0, money: true, icon: Coins, tone: "from-amber-400 to-orange-500", sub: `${data?.creators.activeCycleLabel ?? "—"} cycle pool` },
                { label: "Creator Earnings", value: data?.revenue.creatorEarnings ?? 0, money: true, icon: Sparkles, tone: "from-fuchsia-400 to-pink-500", sub: "Finalised allocations" },
                { label: "Available Balance", value: data?.revenue.available ?? 0, money: true, icon: Wallet, tone: "from-teal-400 to-emerald-500", sub: "Sum of creator wallets" },
                { label: "Withdrawn", value: data?.revenue.withdrawn ?? 0, money: true, icon: Landmark, tone: "from-emerald-400 to-lime-500", sub: `${data?.revenue.withdrawnCount ?? 0} completed payouts` },
                { label: "Pending Payouts", value: data?.revenue.pending ?? 0, money: true, icon: Clock, tone: "from-sky-400 to-blue-500", sub: "Pending + processing" },
                { label: "Total Reports", value: data?.cards.reports ?? 0, icon: Flag, tone: "from-rose-400 to-pink-500", delta: changes.reports },
                { label: "Pending Reports", value: data?.cards.pendingReports ?? 0, icon: AlertTriangle, tone: "from-orange-400 to-red-500", sub: "Awaiting review" },
                { label: "Suspended Users", value: data?.cards.suspended ?? 0, icon: ShieldAlert, tone: "from-rose-500 to-red-600", sub: "Locked accounts" },
                { label: "Banned Users", value: data?.cards.banned ?? 0, icon: ShieldAlert, tone: "from-red-500 to-rose-600", sub: "Permanently banned" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <Card
                    key={card.label}
                    icon={Icon}
                    label={card.label}
                    value={card.value}
                    money={card.money}
                    tone={card.tone}
                    delta={card.delta ?? null}
                    sub={card.sub}
                  />
                );
              })}
        </div>
      </section>

      {/* ---------- 3. ANALYTICS CHARTS ---------- */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Analytics &amp; trends</h3>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel title="User growth" subtitle={`New registrations & active accounts · ${data?.range.label ?? ""}`} empty={loading && !data ? undefined : !chartHasData(series?.users) ? "No user growth data in this range." : undefined}>
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series.users.map((point, index) => ({ ...point, active: series.active[index]?.value ?? 0 }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usersNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="usersActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={fmtTick} tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Area type="monotone" dataKey="value" name="New users" stroke="#22d3ee" strokeWidth={2.5} fill="url(#usersNew)" />
                  <Area type="monotone" dataKey="active" name="Active users" stroke="#34d399" strokeWidth={2.5} fill="url(#usersActive)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>

          <ChartPanel title="Engagement activity" subtitle={`Likes, comments & shares · ${data?.range.label ?? ""}`} empty={loading && !data ? undefined : !chartHasData(series?.engagement.likes) && !chartHasData(series?.engagement.comments) && !chartHasData(series?.engagement.shares) ? "No engagement activity in this range." : undefined}>
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series.engagement.likes.map((point, index) => ({ ...point, comments: series.engagement.comments[index]?.value ?? 0, shares: series.engagement.shares[index]?.value ?? 0 }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="engLikes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f472b6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f472b6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="engComments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="engShares" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={fmtTick} tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Area type="monotone" dataKey="value" name="Likes" stroke="#f472b6" strokeWidth={2.5} fill="url(#engLikes)" />
                  <Area type="monotone" dataKey="comments" name="Comments" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#engComments)" />
                  <Area type="monotone" dataKey="shares" name="Shares" stroke="#f59e0b" strokeWidth={2.5} fill="url(#engShares)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ChartPanel title="Content created" subtitle="Posts & videos" empty={loading && !data ? undefined : !(series?.content ?? []).some((point) => point.posts > 0 || point.videos > 0) ? "No content in this range." : undefined}>
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series.content} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis dataKey="key" tickFormatter={fmtTick} tick={{ fill: "rgba(148,163,184,1)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} />
                  <Bar dataKey="posts" name="Posts" fill="#8b5cf6" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="videos" name="Videos" fill="#d946ef" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>

          <ChartPanel title="Platform revenue" subtitle={`₹${num(data?.revenue.period ?? 0)} this period`} empty={loading && !data ? undefined : !chartHasData(series?.revenue) ? "No revenue in this range." : undefined}>
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series.revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={fmtTick} tick={{ fill: "rgba(148,163,184,1)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={(value) => `₹${Number(value) >= 1000 ? `${Number(value) / 1000}k` : Number(value)}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} formatter={(value) => inr(Number(value ?? 0))} />
                  <Area type="monotone" dataKey="value" name="Revenue" stroke="#22d3ee" strokeWidth={2.5} fill="url(#revArea)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>

          <ChartPanel title="Creator earnings released" subtitle="Per period" empty={loading && !data ? undefined : !chartHasData(series?.creator) ? "No releases in this range." : undefined}>
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series.creator} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="creatorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#c084fc" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={fmtTick} tick={{ fill: "rgba(148,163,184,1)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={(value) => `₹${Number(value) >= 1000 ? `${Number(value) / 1000}k` : Number(value)}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} formatter={(value) => inr(Number(value ?? 0))} />
                  <Area type="monotone" dataKey="value" name="Released" stroke="#c084fc" strokeWidth={2.5} fill="url(#creatorArea)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>

          <ChartPanel title="Withdrawals completed" subtitle={`₹${num(data?.withdrawals.completedPeriod ?? 0)} this period`} empty={loading && !data ? undefined : !chartHasData(series?.withdrawals) ? "No completed withdrawals in this range." : undefined}>
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series.withdrawals} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={fmtTick} tick={{ fill: "rgba(148,163,184,1)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={(value) => `₹${Number(value) >= 1000 ? `${Number(value) / 1000}k` : Number(value)}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} formatter={(value) => inr(Number(value ?? 0))} />
                  <Bar dataKey="value" name="Withdrawn" fill="#34d399" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ChartPanel title="Reports created" subtitle="Moderation queue inflow" empty={loading && !data ? undefined : !chartHasData(series?.reports) ? "No reports filed in this range." : undefined}>
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series.reports} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={fmtTick} tick={{ fill: "rgba(148,163,184,1)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} />
                  <Bar dataKey="value" name="Reports" fill="#fb7185" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>

          <ChartPanel title="Projects created" subtitle="Idea pipeline" empty={loading && !data ? undefined : !chartHasData(series?.projects) ? "No projects created in this range." : undefined}>
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series.projects} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={fmtTick} tick={{ fill: "rgba(148,163,184,1)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} />
                  <Bar dataKey="value" name="Projects" fill="#818cf8" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>

          <ChartPanel title="Active users" subtitle="Connected in this range" empty={loading && !data ? undefined : !chartHasData(series?.active) ? "No active sessions in this range." : undefined}>
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series.active} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="activeArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={fmtTick} tick={{ fill: "rgba(148,163,184,1)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fill: "rgba(148,163,184,1)", fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => fmtTick(String(label))} />
                  <Area type="monotone" dataKey="value" name="Active users" stroke="#34d399" strokeWidth={2.5} fill="url(#activeArea)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>
        </div>
      </section>

      {/* ---------- 4. REVENUE OVERVIEW ---------- */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Revenue &amp; payouts</h3>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Revenue overview" subtitle="Platform → creators → payouts" icon={CircleDollarSign}>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white dark:border-white/10">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Platform revenue</p>
                <p className="mt-1 text-2xl font-black">{inr(data?.revenue.platformRevenue ?? 0)}</p>
                <div className="mt-2">
                  <DeltaBadge value={changes.revenue} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MoneyStat label="Creator revenue pool" value={data?.revenue.creatorPool ?? 0} hint={data?.creators.activeCycleLabel ? `Cycle ${data.creators.activeCycleLabel}` : "No active cycle"} tone="text-amber-400" />
                <MoneyStat label="Creator earnings" value={data?.revenue.creatorEarnings ?? 0} hint="Finalised allocations" tone="text-fuchsia-400" />
                <MoneyStat label="Withdrawn" value={data?.revenue.withdrawn ?? 0} hint={`${data?.revenue.withdrawnCount ?? 0} completed`} tone="text-emerald-400" />
                <MoneyStat label="Pending payouts" value={data?.revenue.pending ?? 0} hint="Pending + processing" tone="text-sky-400" />
                <MoneyStat label="Available balance" value={data?.revenue.available ?? 0} hint="Creator wallets" tone="text-teal-400" />
                <MoneyStat label="Earned (legacy)" value={data?.revenue.walletEarned ?? 0} hint="Per-like wallet ledger" />
              </div>
            </div>
          </Panel>

          <Panel title="Revenue flow" subtitle="How the pool is distributed" icon={Scale}>
            <div className="space-y-2.5">
              {[
                { label: "Platform revenue", value: data?.revenue.platformRevenue ?? 0, fill: "from-indigo-500 to-cyan-400", percent: 100 },
                { label: "Creator revenue pool", value: data?.revenue.creatorPool ?? 0, fill: "from-amber-400 to-orange-500", percent: 100 },
                { label: "Creator earnings", value: data?.revenue.creatorEarnings ?? 0, fill: "from-fuchsia-500 to-pink-500", percent: 100 },
                { label: "Released to creators", value: data?.revenue.released ?? 0, fill: "from-teal-400 to-emerald-500", percent: 100 },
                { label: "Wallet earned (legacy)", value: data?.revenue.walletEarned ?? 0, fill: "from-sky-400 to-blue-500", percent: 100 },
                { label: "Pending payouts", value: data?.revenue.pending ?? 0, fill: "from-rose-400 to-red-500", percent: 100 },
              ].map((row) => {
                const max = Math.max(data?.revenue.platformRevenue ?? 0, data?.revenue.creatorPool ?? 0, data?.revenue.creatorEarnings ?? 0, data?.revenue.released ?? 0, data?.revenue.walletEarned ?? 0, data?.revenue.pending ?? 0, 1);
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-bold text-slate-500 dark:text-slate-400">{row.label}</p>
                      <p className="font-black">{inr(row.value)}</p>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div className={`h-full rounded-full bg-gradient-to-r ${row.fill}`} style={{ width: `${Math.min(100, (row.value / max) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Money is recorded in INR paise across Wallet, EarningTransaction and CreatorRevenueAllocation ledgers.
            </p>
          </Panel>

          <Panel title="Withdrawal overview" subtitle="Status of the payout pipeline" icon={Landmark}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Pending", status: "PENDING", tone: "text-amber-400" },
                { label: "Processing", status: "PROCESSING", tone: "text-sky-400" },
                { label: "Approved", status: "APPROVED", tone: "text-cyan-400" },
                { label: "Completed", status: "COMPLETED", tone: "text-emerald-400" },
                { label: "Failed", status: "FAILED", tone: "text-rose-400" },
                { label: "Rejected", status: "REJECTED", tone: "text-red-400" },
              ].map((item) => (
                <div key={item.status} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className={`text-xl font-black ${item.tone}`}>{num(data?.withdrawals.byStatus[item.status]?.count ?? 0)}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{inr((data?.withdrawals.byStatus[item.status]?.paise ?? 0) / 100)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Total withdrawn</p>
              <p className="text-lg font-black text-emerald-400">{inr(data?.withdrawals.totalAmount ?? 0)}</p>
            </div>
            <Link href="/admin/withdrawals" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-600 hover:underline dark:text-cyan-300">
              Manage withdrawals <ArrowRight size={14} />
            </Link>
          </Panel>
        </div>
      </section>

      {/* ---------- 5, 6, 7. USER / CONTENT / MODERATION ---------- */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="User overview" subtitle="Audience health" icon={Users}>
          <div className="grid grid-cols-2 gap-3">
            <StatChip label="Total users" value={data?.cards.totalUsers ?? 0} tone="text-cyan-400" />
            <StatChip label="Active in range" value={data?.cards.activeUsers ?? 0} tone="text-emerald-400" />
            <StatChip label="New in range" value={data?.cards.newUsers ?? 0} tone="text-sky-400" />
            <StatChip label="Premium" value={data?.cards.premium ?? 0} tone="text-amber-400" />
            <StatChip label="Verified" value={data?.cards.verified ?? 0} tone="text-violet-400" />
            <StatChip label="Suspended" value={data?.cards.suspended ?? 0} tone="text-rose-400" />
            <StatChip label="Banned" value={data?.cards.banned ?? 0} tone="text-red-400" />
          </div>
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Account status breakdown</p>
          <div className="mt-3 space-y-2.5">
            {[
              { label: "Active", value: (data?.cards.totalUsers ?? 0) - (data?.cards.suspended ?? 0) - (data?.cards.banned ?? 0), tone: "bg-emerald-400", percent: 100 },
            ].map((row) => {
              const total = Math.max(data?.cards.totalUsers ?? 1, 1);
              const active = (data?.cards.totalUsers ?? 0) - (data?.cards.suspended ?? 0) - (data?.cards.banned ?? 0);
              const suspended = data?.cards.suspended ?? 0;
              const banned = data?.cards.banned ?? 0;
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>Active</span>
                    <span>{num(active)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(active / total) * 100}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>Suspended</span>
                    <span>{num(suspended)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full rounded-full bg-rose-400" style={{ width: `${(suspended / total) * 100}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>Banned</span>
                    <span>{num(banned)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${(banned / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <DeltaBadge value={changes.activeUsers} suffix="active" />
          </div>
        </Panel>

        <Panel title="Content overview" subtitle="Posts, videos & engagement" icon={Boxes}>
          <div className="grid grid-cols-2 gap-3">
            <StatChip label="Total posts" value={data?.content.posts ?? 0} tone="text-violet-400" />
            <StatChip label="Videos / reels" value={data?.content.videos ?? 0} tone="text-fuchsia-400" />
            <StatChip label="Projects" value={data?.content.projects ?? 0} tone="text-indigo-400" />
            <StatChip label="Removed" value={data?.content.removed ?? 0} tone="text-rose-400" />
            <StatChip label="Likes" value={data?.content.likes ?? 0} tone="text-rose-400" />
            <StatChip label="Comments" value={data?.content.comments ?? 0} tone="text-teal-400" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Likes in range</p>
              <p className="text-lg font-black text-pink-400">{num(data?.engagement.likes ?? 0)}</p>
              <div className="mt-1"><DeltaBadge value={changes.comments && (data?.engagement.likes ?? 0) > 0 ? { current: data?.engagement.likes ?? 0, previous: data?.engagement.likesPrev ?? 0, pct: data?.engagement.likesPrev ? (((data?.engagement.likes ?? 0) - (data?.engagement.likesPrev ?? 0)) / (data?.engagement.likesPrev ?? 0)) * 100 : null } : null} /></div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Comments in range</p>
              <p className="text-lg font-black text-teal-400">{num(data?.engagement.comments ?? 0)}</p>
              <div className="mt-1"><DeltaBadge value={changes.comments} /></div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Shares in range</p>
              <p className="text-lg font-black text-amber-400">{num(data?.engagement.shares ?? 0)}</p>
              <div className="mt-1">
                <DeltaBadge value={{ current: data?.engagement.shares ?? 0, previous: data?.engagement.sharesPrev ?? 0, pct: data?.engagement.sharesPrev ? (((data?.engagement.shares ?? 0) - (data?.engagement.sharesPrev ?? 0)) / (data?.engagement.sharesPrev ?? 0)) * 100 : null }} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Moderation overview" subtitle="Reports & enforcement" icon={ShieldAlert}>
          <div className="grid grid-cols-2 gap-3">
            <StatChip label="Total reports" value={data?.moderation.total ?? 0} tone="text-rose-400" />
            <StatChip label="Pending" value={data?.moderation.pending ?? 0} tone="text-amber-400" />
            <StatChip label="Resolved" value={data?.moderation.resolved ?? 0} tone="text-emerald-400" />
            <StatChip label="Dismissed" value={data?.moderation.dismissed ?? 0} tone="text-slate-400" />
            <StatChip label="Removed content" value={data?.moderation.removedContent ?? 0} tone="text-red-400" />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Reviewing now</p>
            <p className="text-lg font-black text-sky-400">{num(data?.moderation.reviewing ?? 0)}</p>
          </div>
          <Link href="/admin/reports" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-600 hover:underline dark:text-cyan-300">
            Review reports <ArrowRight size={14} />
          </Link>
        </Panel>
      </section>

      {/* ---------- 9. CREATOR REVENUE OVERVIEW ---------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Creator revenue</h3>
          </div>
          <Link href="/admin/creator-revenue" className="inline-flex items-center gap-2 text-sm font-black text-cyan-600 hover:underline dark:text-cyan-300">
            Creator revenue console <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Cycle pool" subtitle={`${data?.creators.activeCycleLabel || "No active cycle"} · ${data?.creators.activeCycleStatus?.toLowerCase() || "—"}`} icon={Coins}>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white dark:border-white/10">
              <p className="text-xs font-black uppercase tracking-wide text-amber-300">Current monthly pool</p>
              <p className="mt-1 text-2xl font-black">{inr(data?.creators.pool ?? 0)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MoneyStat label="Eligible creators" value={data?.creators.eligibleCreators ?? 0} hint="This cycle" />
              <MoneyStat label="Total earning score" value={data?.creators.totalScores ?? 0} hint="Weighted score units" />
              <MoneyStat label="Estimated earnings" value={data?.creators.estimatedEarnings ?? 0} hint="Pool estimate" tone="text-fuchsia-400" />
              <MoneyStat label="Finalised earnings" value={data?.creators.finalizedEarnings ?? 0} hint="Allocated lifetime" tone="text-emerald-400" />
              <MoneyStat label="Released" value={data?.creators.released ?? 0} hint="Paid out lifetime" tone="text-teal-400" />
              <MoneyStat label="Qualified views" value={data?.creators.totalQualifiedViews ?? 0} hint="This cycle" tone="text-sky-400" />
            </div>
          </Panel>

          <Panel title="Top creators by earning score" subtitle="Highest weighted score this cycle" icon={Award}>
            <CreatorList rows={(data?.creators.topCreators ?? {}).byScore ?? []} valueKey="score" format={(value) => value.toFixed(1)} />
          </Panel>

          <Panel title="Top creators by qualified views" subtitle="Most reached content" icon={Zap}>
            <CreatorList rows={(data?.creators.topCreators ?? {}).byViews ?? []} valueKey="qualifiedViews" format={(value) => num(value)} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Top creators by engagement" subtitle="Comments + shares + follows + likes" icon={TrendingUp}>
            <CreatorList rows={(data?.creators.topCreators ?? {}).byEngagement ?? []} valueKey="engagement" format={(value) => num(value)} />
          </Panel>

          <Panel title="Top content by engagement" subtitle="Most liked & discussed posts" icon={MessageSquare}>
            {(data?.content.topContent ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No active posts yet.</p>
            ) : (
              <ol className="space-y-2.5">
                {(data?.content.topContent ?? []).slice(0, 5).map((post, index) => (
                  <li key={post.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white dark:bg-white dark:text-slate-950">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{post.preview || "Untitled post"}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">by {post.authorName} · {timeAgo(post.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs font-black">
                      <span className="inline-flex items-center gap-1 text-rose-400"><Heart size={13} />{num(post.likes)}</span>
                      <span className="inline-flex items-center gap-1 text-teal-400"><MessageSquare size={13} />{num(post.comments)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </section>

      {/* ---------- 11. QUICK ACTIONS ---------- */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Quick actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-8">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.06]"
              >
                <div className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${action.tone} text-white shadow-lg transition group-hover:scale-105`}>
                  <Icon size={18} />
                </div>
                <p className="mt-3 text-xs font-black leading-tight">{action.label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- 10. RECENT ACTIVITY ---------- */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-400" />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Recent activity</h3>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          {loading && !data ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
              ))}
            </div>
          ) : (data?.activity ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No recent activity events yet.</p>
          ) : (
            <ol className="divide-y divide-slate-100 dark:divide-white/5">
              {(data?.activity ?? []).map((item, index) => {
                const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.admin;
                const Icon = meta.icon;
                return (
                  <motion.li
                    key={`${item.timestamp}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-start gap-3 py-3"
                  >
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${meta.tone}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{item.ref}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-black text-slate-500 dark:border-white/10 dark:text-slate-400">{item.status}</span>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{timeAgo(item.timestamp)}</span>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
          <div className="mt-3 border-t border-slate-100 pt-3 text-center dark:border-white/5">
            <Link href="/admin/audit-log" className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-600 hover:underline dark:text-cyan-300">
              <Settings2 size={13} /> View full audit log
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}