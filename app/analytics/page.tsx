"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Send, Sparkles, Wallet } from "lucide-react";

type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  payoutDetailsMasked: string;
  transactionId: string;
  failureReason?: string;
  createdAt: string | null;
};

type CreatorEstimate = {
  score: number;
  qualifiedViews: number;
  qualifiedWatchMs: number;
  completedViews: number;
  uniqueViewers: number;
  returningViewers: number;
  meaningfulComments: number;
  qualifiedShares: number;
  qualifiedFollows: number;
  eligible: boolean;
  reasons: string[];
  parts?: Array<{ key: string; subScore: number; weighted: number }>;
  totalEligibleScores: number;
  shareFraction: number;
  sharePercent: number;
  estimatedPoolPaise: number;
  estimatedRevenuePaise: number;
  revenueState?: string;
  hasCachedCalculation?: boolean;
};

type CreatorAllocation = {
  id: string;
  cycleLabel?: string;
  score?: number;
  poolAmount?: number;
  creatorSharePercent?: number;
  finalRevenuePaise?: number;
  currency?: string;
  revenueState?: string;
  finalizedAt?: string | null;
  releasedAt?: string | null;
};

type AnalyticsPayload = {
  ratePerLike: number;
  minimumAmountToWithdraw: number;
  withdrawalsEnabled: boolean;
  wallet: { availableBalance: number; totalEarned: number; totalWithdrawn: number };
  currentCycle: { eligibleLikes: number; earnedAmount: number; status: string };
  lifetimeLikes: number;
  totalVideos: number;
  totalContent: number;
  topVideo: { title: string; likes: number } | null;
  videos: Array<{ id: string; title: string; likes: number; earnings: number; createdAt: string | null }>;
  withdrawals: Withdrawal[];
  creatorRevenue: {
    cycle: { id: string; label: string; status: string; poolAmount: number } | null;
    estimate: CreatorEstimate | null;
    history: { allocations: CreatorAllocation[]; transactions: Array<{ id: string; type: string; amountPaise: number; status: string; createdAt: string | null }> };
  } | null;
};

const EMPTY: AnalyticsPayload = {
  ratePerLike: 0.05,
  minimumAmountToWithdraw: 100,
  withdrawalsEnabled: true,
  wallet: { availableBalance: 0, totalEarned: 0, totalWithdrawn: 0 },
  currentCycle: { eligibleLikes: 0, earnedAmount: 0, status: "OPEN" },
  lifetimeLikes: 0,
  totalVideos: 0,
  totalContent: 0,
  topVideo: null,
  videos: [],
  withdrawals: [],
  creatorRevenue: null,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [method, setMethod] = useState<"UPI" | "BANK">("UPI");
  const [vpa, setVpa] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canWithdraw =
    analytics.withdrawalsEnabled &&
    analytics.wallet.availableBalance >= analytics.minimumAmountToWithdraw;

  const loadAnalytics = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to load analytics");
      setAnalytics({ ...EMPTY, ...data, videos: data.videos || [], withdrawals: data.withdrawals || [] });
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

  async function requestWithdrawal() {
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const payoutDetails =
        method === "UPI" ? { method, vpa } : { method, accountHolderName, accountNumber, ifsc };
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `withdraw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ payoutDetails, idempotencyKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to request withdrawal");
      setNotice("Withdrawal request submitted for admin review.");
      setWithdrawOpen(false);
      await loadAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request withdrawal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#020617,#050505)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
              <CheckCircle2 size={14} />
              My analytics only
            </div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Creator Earnings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Lifetime likes stay visible forever. Withdrawals only consume unpaid ledger earnings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void loadAnalytics();
            }}
            disabled={loading || refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        {error && <div className="flex items-center gap-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"><AlertCircle size={18} />{error}</div>}
        {notice && <div className="flex items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"><CheckCircle2 size={18} />{notice}</div>}

        {loading ? (
          <Card className="flex min-h-[22rem] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-300"><Loader2 className="animate-spin" size={22} />Loading your earnings...</div>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Available Balance" value={formatCurrency(analytics.wallet.availableBalance)} helper={`Minimum withdrawal: ${formatCurrency(analytics.minimumAmountToWithdraw)}`} />
              <Metric label="Total Earned" value={formatCurrency(analytics.wallet.totalEarned)} helper={`${formatCurrency(analytics.ratePerLike)} per eligible like`} />
              <Metric label="Total Withdrawn" value={formatCurrency(analytics.wallet.totalWithdrawn)} helper="Completed payouts only" />
              <Metric label="Eligible Likes" value={formatNumber(analytics.currentCycle.eligibleLikes)} helper="Unpaid earning cycle" />
            </section>

            <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-200"><Wallet size={20} /><h2 className="text-xl font-black">Withdraw Earnings</h2></div>
                <p className="mt-2 text-sm text-slate-400">
                  Available: {formatCurrency(analytics.wallet.availableBalance)}. This does not reset likes on your content.
                </p>
              </div>
              <button type="button" disabled={!canWithdraw} onClick={() => setWithdrawOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
                <Send size={16} />
                Withdraw
              </button>
            </Card>

            {analytics.creatorRevenue?.cycle && (
              <Card className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-fuchsia-200">
                      <Sparkles size={20} />
                      <h2 className="text-xl font-black">Creator Earning Score</h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      Cycle <span className="font-bold text-white">{analytics.creatorRevenue.cycle.label}</span> ·{" "}
                      {analytics.creatorRevenue.cycle.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-5xl font-black text-fuchsia-300">
                      {(analytics.creatorRevenue.estimate?.score ?? 0).toFixed(1)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {analytics.creatorRevenue.estimate?.revenueState
                        ? `${analytics.creatorRevenue.estimate.revenueState} earning score`
                        : "estimated earning score"}
                    </p>
                  </div>
                </div>

                {analytics.creatorRevenue.estimate ? (
                  <>
                    <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase text-slate-500">Est. monthly revenue</p>
                        <p className="mt-1 text-2xl font-black text-emerald-300">
                          {formatCurrency(analytics.creatorRevenue.estimate.estimatedRevenuePaise / 100)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-500">Pool share</p>
                        <p className="mt-1 text-2xl font-black">{analytics.creatorRevenue.estimate.sharePercent.toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-500">Cycle pool</p>
                        <p className="mt-1 text-2xl font-black">{formatCurrency(analytics.creatorRevenue.cycle.poolAmount / 100)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-300">Metric breakdown</p>
                      <div className="mt-3 space-y-3">
                        {(analytics.creatorRevenue.estimate.parts ?? []).map((part) => (
                          <div key={part.key}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white">{part.key.replace(/([A-Z])/g, " $1").trim()}</span>
                              <span className="text-slate-400">{part.subScore.toFixed(1)} / weighted {part.weighted.toFixed(1)}</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-full bg-fuchsia-400" style={{ width: `${Math.min(100, part.subScore)}%` }} />
                            </div>
                          </div>
                        ))}
                        {!analytics.creatorRevenue.estimate.parts?.length && (
                          <p className="text-sm text-slate-500">No scoring data yet for this cycle.</p>
                        )}
                      </div>
                    </div>

                    {analytics.creatorRevenue.estimate.eligible === false &&
                      analytics.creatorRevenue.estimate.reasons?.length > 0 && (
                        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                          <p className="font-bold">Not yet eligible for this cycle:</p>
                          <ul className="mt-1 list-inside list-disc space-y-0.5">
                            {analytics.creatorRevenue.estimate.reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    <div>
                      <p className="text-sm font-bold text-slate-300">Revenue history</p>
                      <div className="mt-3 space-y-2">
                        {analytics.creatorRevenue.history.allocations.map((allocation) => (
                          <div key={allocation.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                            <div>
                              <p className="font-black">{allocation.cycleLabel}</p>
                              <p className="mt-0.5 text-xs text-slate-500">Score {allocation.score?.toFixed(1) ?? "—"} · {allocation.revenueState}</p>
                            </div>
                            <p className="font-black text-emerald-300">{formatCurrency((allocation.finalRevenuePaise ?? 0) / 100)}</p>
                          </div>
                        ))}
                        {analytics.creatorRevenue.history.allocations.length === 0 && (
                          <p className="text-sm text-slate-500">No finalized payouts yet.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">No qualifying activity for this cycle yet.</p>
                )}
              </Card>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Lifetime Likes" value={formatNumber(analytics.lifetimeLikes)} helper="Never reset after withdrawal" />
              <Metric label="Total Videos" value={formatNumber(analytics.totalVideos)} helper={`${formatNumber(analytics.totalContent)} total content items`} />
              <Metric label="Current Earnings" value={formatCurrency(analytics.currentCycle.earnedAmount)} helper={`Cycle status: ${analytics.currentCycle.status}`} />
              <Metric label="Top Performer" value={analytics.topVideo ? formatNumber(analytics.topVideo.likes) : "0"} helper={analytics.topVideo?.title || "No top video yet"} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <Card>
                <h2 className="text-xl font-black">Video Performance</h2>
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                  <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem] gap-4 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase text-slate-400 md:grid">
                    <span>Video</span><span className="text-right">Likes</span><span className="text-right">Ledger Value</span>
                  </div>
                  {analytics.videos.map((video, index) => (
                    <div key={video.id} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_7rem_8rem] md:items-center">
                      <div className="min-w-0"><p className="truncate font-bold">{video.title || `Video ${index + 1}`}</p><p className="mt-1 text-xs text-slate-500">{formatDate(video.createdAt)}</p></div>
                      <p className="font-black md:text-right"><span className="mr-2 text-xs uppercase text-slate-500 md:hidden">Likes</span>{formatNumber(video.likes)}</p>
                      <p className="font-black text-emerald-300 md:text-right"><span className="mr-2 text-xs uppercase text-slate-500 md:hidden">Value</span>{formatCurrency(video.earnings)}</p>
                    </div>
                  ))}
                  {analytics.videos.length === 0 && <p className="p-5 text-sm text-slate-400">Your video rows will appear after you upload videos or reels.</p>}
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-black">Withdrawal History</h2>
                <div className="mt-4 space-y-3">
                  {analytics.withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black">{formatCurrency(withdrawal.amount)}</p>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">{withdrawal.status}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(withdrawal.createdAt)} · {withdrawal.payoutDetailsMasked}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">Transaction: {withdrawal.transactionId}</p>
                      {withdrawal.failureReason && <p className="mt-2 text-xs text-rose-200">Reason: {withdrawal.failureReason}</p>}
                    </div>
                  ))}
                  {analytics.withdrawals.length === 0 && <p className="text-sm text-slate-400">No withdrawals yet.</p>}
                </div>
              </Card>
            </section>
          </>
        )}
      </div>

      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
            <h2 className="text-xl font-black">Request Withdrawal</h2>
            <p className="mt-2 text-sm text-slate-400">Amount: {formatCurrency(analytics.wallet.availableBalance)} · Minimum: {formatCurrency(analytics.minimumAmountToWithdraw)}</p>
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
              {(["UPI", "BANK"] as const).map((item) => (
                <button key={item} type="button" onClick={() => setMethod(item)} className={`rounded-lg px-3 py-2 text-sm font-bold ${method === item ? "bg-white text-slate-950" : "text-slate-300"}`}>{item}</button>
              ))}
            </div>
            {method === "UPI" ? (
              <input value={vpa} onChange={(event) => setVpa(event.target.value)} placeholder="name@upi" className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-300" />
            ) : (
              <div className="mt-4 grid gap-3">
                <input value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)} placeholder="Account holder name" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-300" />
                <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account number" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-300" />
                <input value={ifsc} onChange={(event) => setIfsc(event.target.value)} placeholder="IFSC" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm uppercase outline-none focus:border-emerald-300" />
              </div>
            )}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setWithdrawOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold">Cancel</button>
              <button type="button" disabled={submitting} onClick={requestWithdrawal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60">
                {submitting && <Loader2 className="animate-spin" size={16} />} Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
