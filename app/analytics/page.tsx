"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Gauge,
  Lock,
  RefreshCw,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

type TimeRange = "24h" | "7d" | "30d" | "90d";

type SummaryMetric = {
  title: string;
  value: string;
  rawValue: number;
  change: number;
  subtext: string;
  icon: string;
};

type SeriesPoint = {
  label: string;
  totalUsers: number;
  activeUsers: number;
};

type EngagementPoint = {
  label: string;
  value: number;
};

type PiePoint = {
  name: string;
  value: number;
  color: string;
};

type RealTimePoint = {
  time: string;
  active: number;
};

type LabelMetric = {
  label: string;
  value: string;
  change: number;
};

type PerformanceMetric = {
  label: string;
  value: string;
  progress: number;
  color: string;
};

type SecurityMetric = {
  label: string;
  value: string | number;
  status: string;
};

type PredictiveMetric = {
  label: string;
  detail: string;
  value: string;
};

type AnalyticsPayload = {
  range: TimeRange;
  generatedAt: string;
  summary: SummaryMetric[];
  userGrowth: SeriesPoint[];
  engagement: EngagementPoint[];
  trafficSources: PiePoint[];
  deviceDistribution: PiePoint[];
  realTimeActivity: RealTimePoint[];
  userAnalytics: LabelMetric[];
  performance: PerformanceMetric[];
  security: SecurityMetric[];
  predictive: PredictiveMetric[];
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

const FALLBACK_DATA: AnalyticsPayload = {
  range: "7d",
  generatedAt: new Date().toISOString(),
  summary: [
    { title: "Total Users", value: "0", rawValue: 0, change: 0, subtext: "No registrations yet", icon: "users" },
    { title: "Active Users", value: "0", rawValue: 0, change: 0, subtext: "Recent account activity", icon: "activity" },
    { title: "Avg. Session Time", value: "0m 00s", rawValue: 0, change: 0, subtext: "Estimated engagement", icon: "clock" },
    { title: "Conversion Rate", value: "0.0%", rawValue: 0, change: 0, subtext: "Premium users", icon: "trend" },
    { title: "Revenue", value: "₹0", rawValue: 0, change: 0, subtext: "Premium subscription estimate", icon: "revenue" },
    { title: "System Performance", value: "99.00%", rawValue: 99, change: 0, subtext: "Operational score", icon: "performance" },
  ],
  userGrowth: Array.from({ length: 7 }, (_, index) => ({
    label: `Day ${index + 1}`,
    totalUsers: 0,
    activeUsers: 0,
  })),
  engagement: [
    { label: "Sessions", value: 0 },
    { label: "Page Views", value: 0 },
    { label: "Avg Duration", value: 0 },
    { label: "Bounce Rate", value: 0 },
  ],
  trafficSources: [
    { name: "Direct", value: 35, color: "#22d3ee" },
    { name: "Social", value: 25, color: "#a78bfa" },
    { name: "Search", value: 20, color: "#34d399" },
    { name: "Referral", value: 12, color: "#fbbf24" },
    { name: "Email", value: 8, color: "#fb7185" },
  ],
  deviceDistribution: [
    { name: "Mobile", value: 62, color: "#22d3ee" },
    { name: "Desktop", value: 30, color: "#34d399" },
    { name: "Tablet", value: 8, color: "#a78bfa" },
  ],
  realTimeActivity: Array.from({ length: 10 }, (_, index) => ({
    time: `${index + 1}`,
    active: 0,
  })),
  userAnalytics: [
    { label: "New Registrations", value: "0", change: 0 },
    { label: "Returning Users", value: "0", change: 0 },
    { label: "User Retention", value: "0.0%", change: 0 },
    { label: "Avg. Session Time", value: "0m 00s", change: 0 },
  ],
  performance: [
    { label: "Server Response Time", value: "0ms", progress: 92, color: "#34d399" },
    { label: "API Latency", value: "0ms", progress: 94, color: "#22d3ee" },
    { label: "Database Queries", value: "0/day", progress: 80, color: "#a78bfa" },
    { label: "Cache Hit Rate", value: "94%", progress: 94, color: "#fbbf24" },
  ],
  security: [
    { label: "Failed Logins", value: 0, status: "Monitored" },
    { label: "Threats Detected", value: 0, status: "Clear" },
    { label: "Uptime", value: "99.00%", status: "Healthy" },
    { label: "SSL Status", value: "Active", status: "Encrypted" },
  ],
  predictive: [
    { label: "Projected Growth", detail: "Next 30 days", value: "+0.0%" },
    { label: "Revenue Forecast", detail: "Next quarter", value: "₹0" },
    { label: "Peak Load Prediction", detail: "Expected max users", value: "0" },
  ],
};

const metricIcons = {
  users: Users,
  activity: Activity,
  clock: Clock,
  trend: TrendingUp,
  revenue: Wallet,
  performance: Zap,
};

const metricGradients = [
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-orange-500",
  "from-lime-500 to-emerald-500",
  "from-sky-500 to-indigo-500",
];

function formatChange(change: number) {
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change.toFixed(Math.abs(change) % 1 === 0 ? 0 : 1)}%`;
}

function chartTooltipStyle() {
  return {
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: "12px",
    color: "#f8fafc",
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
  };
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyFreeChartShell({ children }: { children: React.ReactNode }) {
  return <div className="h-72 min-h-72 w-full">{children}</div>;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [analytics, setAnalytics] = useState<AnalyticsPayload>(FALLBACK_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeGrowthSeries, setActiveGrowthSeries] = useState<"both" | "total" | "active">("both");

  const loadAnalytics = useCallback(
    async (range: TimeRange, background = false) => {
      if (!background) setIsRefreshing(true);

      try {
        const response = await fetch(`/api/analytics?range=${range}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load analytics");
        }

        const data = (await response.json()) as AnalyticsPayload;
        setAnalytics(data);
        setLastUpdated(new Date(data.generatedAt || new Date().toISOString()));
      } catch (error) {
        console.error("Analytics load failed:", error);
      } finally {
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAnalytics(timeRange);
  }, [loadAnalytics, timeRange]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalytics(timeRange, true);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAnalytics, timeRange]);

  const currentActiveUsers = useMemo(() => {
    const lastPoint = analytics.realTimeActivity.at(-1);
    return lastPoint?.active.toLocaleString() || "0";
  }, [analytics.realTimeActivity]);

  function exportAnalytics() {
    const blob = new Blob([JSON.stringify(analytics, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orbitbyte-analytics-${timeRange}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_28%),linear-gradient(135deg,#020617,#0f172a_45%,#111827)]" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Account Intelligence
            </p>
            <h1 className="bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              Analytics Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Real-time insights and performance metrics for users, engagement, security, and system health.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="relative">
              <span className="sr-only">Date range</span>
              <select
                value={timeRange}
                onChange={(event) => setTimeRange(event.target.value as TimeRange)}
                className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-slate-950/70 px-4 pr-10 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              >
                {Object.entries(TIME_RANGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </label>

            <button
              type="button"
              onClick={() => loadAnalytics(timeRange)}
              disabled={isRefreshing}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-slate-100 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportAnalytics}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {analytics.summary.map((metric, index) => {
            const Icon = metricIcons[metric.icon as keyof typeof metricIcons] || Gauge;
            const isPositive = metric.change >= 0;

            return (
              <Card key={metric.title} className="p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className={`rounded-xl bg-gradient-to-br ${metricGradients[index % metricGradients.length]} p-2.5 text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      isPositive
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    {formatChange(metric.change)}
                  </span>
                </div>
                <p className="truncate text-2xl font-bold text-white">{metric.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-300">{metric.title}</p>
                <p className="mt-2 min-h-8 text-xs leading-4 text-slate-500">{metric.subtext}</p>
              </Card>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle
                title="User Growth"
                subtitle="Active users compared with total users over time"
                icon={<Users className="h-5 w-5 text-cyan-300" />}
              />
              <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
                {(["both", "total", "active"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveGrowthSeries(value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                      activeGrowthSeries === value
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <EmptyFreeChartShell>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.userGrowth} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalUsersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="activeUsersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                  <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  {(activeGrowthSeries === "both" || activeGrowthSeries === "total") && (
                    <Area type="monotone" dataKey="totalUsers" name="Total Users" stroke="#22d3ee" fill="url(#totalUsersFill)" strokeWidth={2.5} />
                  )}
                  {(activeGrowthSeries === "both" || activeGrowthSeries === "active") && (
                    <Area type="monotone" dataKey="activeUsers" name="Active Users" stroke="#34d399" fill="url(#activeUsersFill)" strokeWidth={2.5} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </EmptyFreeChartShell>
          </Card>

          <Card>
            <SectionTitle
              title="Engagement Metrics"
              subtitle="Sessions, page views, duration, and bounce behavior"
              icon={<Activity className="h-5 w-5 text-violet-300" />}
            />
            <EmptyFreeChartShell>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.engagement} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                  <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#a78bfa" />
                </BarChart>
              </ResponsiveContainer>
            </EmptyFreeChartShell>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card>
            <SectionTitle title="Traffic Sources" subtitle="Where account visits originate" icon={<Wifi className="h-5 w-5 text-cyan-300" />} />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.trafficSources} dataKey="value" nameKey="name" innerRadius={42} outerRadius={82} paddingAngle={3}>
                    {analytics.trafficSources.map((source) => (
                      <Cell key={source.name} fill={source.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle()} formatter={(value, name) => [`${value}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {analytics.trafficSources.map((source) => (
                <div key={source.name} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                  {source.name} {source.value}%
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Device Distribution" subtitle="Mobile, desktop, and tablet share" icon={<Smartphone className="h-5 w-5 text-emerald-300" />} />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.deviceDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
                    {analytics.deviceDistribution.map((device) => (
                      <Cell key={device.name} fill={device.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle()} formatter={(value, name) => [`${value}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {analytics.deviceDistribution.map((device) => (
                <div key={device.name} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: device.color }} />
                    {device.name}
                  </span>
                  <span className="font-semibold text-white">{device.value}%</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <SectionTitle title="Real-time Activity" subtitle="Active users by timestamp" icon={<Gauge className="h-5 w-5 text-amber-300" />} />
              <span className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                Live
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.realTimeActivity} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                  <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  <Line type="monotone" dataKey="active" name="Active Users" stroke="#fbbf24" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-400/10 to-cyan-400/10 p-4 text-center">
              <p className="text-3xl font-bold text-white">{currentActiveUsers}</p>
              <p className="text-xs text-slate-400">Active users right now</p>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle title="User Analytics" subtitle="Account behavior and retention" icon={<Users className="h-5 w-5 text-cyan-300" />} />
            <div className="space-y-3">
              {analytics.userAnalytics.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] p-3">
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white">{item.value}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.change >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                      {formatChange(item.change)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Performance Metrics" subtitle="Infrastructure quality indicators" icon={<Zap className="h-5 w-5 text-amber-300" />} />
            <div className="space-y-4">
              {analytics.performance.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-300">{item.label}</span>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.progress}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="bg-gradient-to-br from-slate-950/90 to-rose-950/20">
            <SectionTitle title="Security Analytics" subtitle="Account protection and platform status" icon={<Shield className="h-5 w-5 text-rose-300" />} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {analytics.security.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Lock className="h-4 w-4 text-rose-300" />
                    <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[11px] text-slate-400">{item.status}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-slate-950/90 to-cyan-950/20">
            <SectionTitle title="Predictive Analytics" subtitle="Forecasts based on current account activity" icon={<TrendingUp className="h-5 w-5 text-cyan-300" />} />
            <div className="space-y-3">
              {analytics.predictive.map((item, index) => (
                <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                      {index === 0 ? <TrendingUp className="h-5 w-5" /> : index === 1 ? <Wallet className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-cyan-200">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Systems operational
          </span>
          <span>OrbitByte Analytics v2.2</span>
        </footer>
      </div>
    </main>
  );
}
