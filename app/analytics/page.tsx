"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  BarChart3,
  Heart,
  Loader2,
  PlaySquare,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Wallet,
} from "lucide-react";

type VideoAnalytics = {
  id: string;
  title: string;
  likes: number;
  earnings: number;
  videoUrl: string;
  createdAt: string | null;
};

type AnalyticsPayload = {
  generatedAt: string;
  ratePerLike: number;
  totalLikes: number;
  totalEarnings: number;
  totalVideos: number;
  totalContent: number;
  topVideo: VideoAnalytics | null;
  videos: VideoAnalytics[];
};

const EMPTY_ANALYTICS: AnalyticsPayload = {
  generatedAt: new Date().toISOString(),
  ratePerLike: 0.05,
  totalLikes: 0,
  totalEarnings: 0,
  totalVideos: 0,
  totalContent: 0,
  topVideo: null,
  videos: [],
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 truncate text-2xl font-black text-white sm:text-3xl">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-400/15 text-indigo-200">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="flex min-h-[18rem] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-400/15 text-indigo-200">
        <BarChart3 size={30} />
      </div>
      <h2 className="mt-5 text-2xl font-black text-white">No analytics available yet</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        Upload and share your content to start seeing your performance and earnings.
      </p>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Unable to load analytics");
      }

      setAnalytics({
        ...EMPTY_ANALYTICS,
        ...data,
        videos: Array.isArray(data.videos) ? data.videos : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const chartData = useMemo(
    () =>
      analytics.videos.map((video, index) => ({
        name: video.title || `Video ${index + 1}`,
        shortName: `V${index + 1}`,
        likes: video.likes,
        earnings: video.earnings,
      })),
    [analytics.videos]
  );

  const hasAnalytics = analytics.totalVideos > 0 || analytics.totalLikes > 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_32rem),linear-gradient(180deg,#020617,#050505)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
              <ShieldCheck size={14} />
              My analytics only
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Your OrbitByte Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Likes, videos, and earnings calculated only from content created by your logged-in account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void loadAnalytics();
            }}
            disabled={loading || refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <Card className="flex min-h-[22rem] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="animate-spin" size={22} />
              Loading your analytics...
            </div>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Your Total Likes"
                value={formatNumber(analytics.totalLikes)}
                helper="Across your posts, videos, and reels"
                icon={<Heart size={22} />}
              />
              <SummaryCard
                label="Your Total Earnings"
                value={formatCurrency(analytics.totalEarnings)}
                helper={`${formatNumber(analytics.totalLikes)} likes x ${formatCurrency(analytics.ratePerLike)}`}
                icon={<Wallet size={22} />}
              />
              <SummaryCard
                label="Per Like"
                value={formatCurrency(analytics.ratePerLike)}
                helper="Fixed rate per like, equal to 5 paise"
                icon={<Trophy size={22} />}
              />
              <SummaryCard
                label="Your Videos"
                value={formatNumber(analytics.totalVideos)}
                helper={`${formatNumber(analytics.totalContent)} total content item(s) from you`}
                icon={<PlaySquare size={22} />}
              />
            </section>

            {!hasAnalytics ? (
              <EmptyState />
            ) : (
              <section className="grid gap-6 lg:grid-cols-[minmax(0,0.68fr)_minmax(22rem,0.32fr)]">
                <Card className="min-w-0">
                  <div className="mb-5 flex flex-col gap-1">
                    <h2 className="text-xl font-black">Video Performance</h2>
                    <p className="text-sm text-slate-400">
                      Likes and earnings for each video or reel uploaded by you.
                    </p>
                  </div>

                  {analytics.videos.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">
                      You have likes on content, but no uploaded videos or reels were found yet.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <div className="hidden grid-cols-[minmax(0,1fr)_8rem_9rem] gap-4 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 md:grid">
                        <span>Video</span>
                        <span className="text-right">Likes</span>
                        <span className="text-right">Earnings</span>
                      </div>

                      <div className="divide-y divide-white/10">
                        {analytics.videos.map((video, index) => (
                          <div key={video.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_8rem_9rem] md:items-center md:gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-bold text-white">{video.title || `Video ${index + 1}`}</p>
                              <p className="mt-1 text-xs text-slate-500">{formatDate(video.createdAt)}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4 md:block md:text-right">
                              <span className="text-xs font-bold uppercase text-slate-500 md:hidden">Likes</span>
                              <span className="font-black text-white">{formatNumber(video.likes)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 md:block md:text-right">
                              <span className="text-xs font-bold uppercase text-slate-500 md:hidden">Earnings</span>
                              <span className="font-black text-emerald-300">{formatCurrency(video.earnings)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                <div className="grid gap-6">
                  <Card>
                    <div className="mb-4 flex items-center gap-2">
                      <Trophy className="text-amber-300" size={20} />
                      <h2 className="text-lg font-black">Top Performing Video</h2>
                    </div>
                    {analytics.topVideo ? (
                      <div className="space-y-4">
                        <div className="min-w-0 rounded-2xl border border-amber-200/15 bg-amber-300/10 p-4">
                          <p className="truncate text-lg font-black">{analytics.topVideo.title}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDate(analytics.topVideo.createdAt)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-black/25 p-4">
                            <p className="text-xs text-slate-500">Likes</p>
                            <p className="mt-1 text-xl font-black">{formatNumber(analytics.topVideo.likes)}</p>
                          </div>
                          <div className="rounded-2xl bg-black/25 p-4">
                            <p className="text-xs text-slate-500">Earnings</p>
                            <p className="mt-1 text-xl font-black text-emerald-300">{formatCurrency(analytics.topVideo.earnings)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-slate-400">
                        Upload a video or reel to see your top performer here.
                      </p>
                    )}
                  </Card>

                  <Card className="min-h-[22rem]">
                    <div className="mb-4">
                      <h2 className="text-lg font-black">Likes by Video</h2>
                      <p className="mt-1 text-xs text-slate-400">Your videos only. No platform-wide data.</p>
                    </div>
                    {chartData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                            <XAxis dataKey="shortName" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                              cursor={{ fill: "rgba(99,102,241,0.12)" }}
                              contentStyle={{
                                backgroundColor: "rgba(15,23,42,0.96)",
                                border: "1px solid rgba(148,163,184,0.24)",
                                borderRadius: "14px",
                                color: "#fff",
                              }}
                              formatter={(value, name) => [
                                name === "earnings" ? formatCurrency(Number(value)) : formatNumber(Number(value)),
                                name === "earnings" ? "Earnings" : "Likes",
                              ]}
                            />
                            <Bar dataKey="likes" fill="#818cf8" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-center text-sm text-slate-400">
                        Your video chart will appear after you upload videos or reels.
                      </div>
                    )}
                  </Card>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
