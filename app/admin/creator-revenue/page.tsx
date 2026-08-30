"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Coins,
  Eye,
  Loader2,
  Play,
  Users,
} from "lucide-react";
import { AdminEmptyState } from "../components/AdminEmptyState";

function inr(value?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

function num(value?: number | null) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function statusBadge(status?: string | null) {
  const map: Record<string, string> = {
    OPEN: "bg-emerald-500/15 text-emerald-300",
    UNDER_REVIEW: "bg-amber-500/15 text-amber-300",
    FINALIZED: "bg-cyan-500/15 text-cyan-300",
    PAID: "bg-violet-500/15 text-violet-300",
    ESTIMATED: "bg-sky-500/15 text-sky-300",
    RELEASED: "bg-teal-500/15 text-teal-300",
    FROZEN: "bg-rose-500/15 text-rose-300",
    REJECTED: "bg-rose-500/15 text-rose-300",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${map[status ?? ""] ?? "bg-white/10 text-slate-400"}`}>{status ?? "—"}</span>;
}

type Cycle = {
  id: string;
  label: string;
  status: string;
  poolPaise?: number;
  totalEligibleScores?: number;
  totalEligibleCreators?: number;
  releasedRevenuePaise?: number;
  finalizedAt?: string | null;
  paidAt?: string | null;
  calculatedAt?: string | null;
};

type Overview = {
  config: {
    enabled?: boolean;
    weights?: Record<string, number>;
    normalization?: Record<string, { cap?: number; floor?: number; curvePower?: number }>;
    viewQuality?: Record<string, number | boolean>;
    commentQuality?: Record<string, number | boolean>;
    eligibility?: { minQualifiedViews?: number; minUniqueViewers?: number; minActiveDays?: number };
    pool?: { platformSharePercent?: number };
    minimumWithdrawalPaise?: number;
  };
  poolPaise: number;
  activeCycle: Cycle | null;
  cycles: Cycle[];
  fraudByStatus: Record<string, number>;
  snapshotsByState: Record<string, number>;
};

type FraudQueued = {
  id: string;
  creatorId: string;
  riskScore: number;
  qualifiedViews: number;
  rejectedViews: number;
  suspiciousViews: number;
  status: string;
  note: string;
  score: number | null;
  revenueState: string | null;
  cycleLabel: string | null;
};

type FraudOverview = {
  cycleLabel: string | null;
  cycleId: string | null;
  queue: FraudQueued[];
  actions: string[];
};

type CycleDetail = {
  cycle: Cycle;
  snapshots: Array<{
    id: string;
    creatorId: string;
    score: number;
    eligible: boolean;
    revenueState: string;
    qualifiedViews: number;
    ineligibilityReasons?: string[];
  }>;
  allocations: Array<{
    id: string;
    creatorId: string;
    cycleLabel: string;
    score: number;
    creatorSharePercent: number;
    finalRevenuePaise: number;
    revenueState: string;
  }>;
  reviews: Array<{ id: string; creatorId: string; riskScore: number; status: string; note: string }>;
};

export default function AdminCreatorRevenuePage() {
  const [tab, setTab] = useState<"overview" | "cycles" | "fraud">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [fraudData, setFraudData] = useState<FraudOverview | null>(null);
  const [detail, setDetail] = useState<CycleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [minPayout, setMinPayout] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/creator-revenue", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load creator revenue");
      setOverview(payload);
      setMinPayout(String(payload.config.minimumWithdrawalPaise ?? ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load creator revenue");
    } finally {
      setLoading(false);
    }
  }

  async function loadFraud() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/creator-revenue/fraud", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load fraud queue");
      setFraudData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load fraud queue");
    } finally {
      setLoading(false);
    }
  }

  async function openCycle(cycleId: string) {
    setBusy(cycleId);
    setError("");
    try {
      const res = await fetch(`/api/admin/creator-revenue/cycles/${cycleId}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load cycle");
      setDetail(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load cycle");
    } finally {
      setBusy("");
    }
  }

  async function cycleAction(cycleId: string, action: string) {
    if (!window.confirm(`Run '${action}' on this earning cycle?`)) return;
    setBusy(`${cycleId}:${action}`);
    setError("");
    try {
      const res = await fetch(`/api/admin/creator-revenue/cycles/${cycleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Action failed");
      await openCycle(cycleId);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy("");
    }
  }

  async function fraudAction(creatorId: string, action: string) {
    if (!window.confirm(`Apply '${action}' to creator ${creatorId}?`)) return;
    setBusy(`${creatorId}:${action}`);
    setError("");
    try {
      const res = await fetch("/api/admin/creator-revenue/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, action, cycleLabel: fraudData?.cycleLabel ?? undefined }),
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Action failed");
      await loadFraud();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy("");
    }
  }

  async function saveConfig() {
    setBusy("config");
    setError("");
    const min = parseInt(minPayout, 10);
    if (!Number.isFinite(min) || min < 0) {
      setError("Minimum payout must be a non-negative amount in paise");
      setBusy("");
      return;
    }
    try {
      const res = await fetch("/api/admin/creator-revenue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minimumWithdrawalPaise: min }),
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Config update failed");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Config update failed");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  const switchTab = (next: typeof tab) => {
    setTab(next);
    setError("");
    if (next === "fraud" && !fraudData) void loadFraud();
  };

  if (loading && !overview && !fraudData) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-3xl bg-white/75 dark:bg-white/10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Creator revenue system</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Creator Revenue</h2>
      </section>

      {error ? <AdminEmptyState icon={Ban} title={error} description="Retry or check the admin API route." onRetry={() => (tab === "fraud" ? loadFraud() : loadOverview())} /> : null}

      <div className="flex flex-wrap gap-2">
        {(["overview", "cycles", "fraud"] as const).map((key) => (
          <button key={key} onClick={() => switchTab(key)} className={`rounded-2xl px-4 py-2 text-sm font-black capitalize transition ${tab === key ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"}`}>
            {key}
          </button>
        ))}
      </div>

      {tab === "overview" && overview ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Cycle pool", value: inr(overview.poolPaise / 100), icon: Coins },
              { label: "Active cycle", value: overview.activeCycle?.label ?? "—", icon: Play },
              { label: "Eligible creators", value: num(overview.activeCycle?.totalEligibleCreators), icon: Users },
              { label: "Fraud under review", value: num(overview.fraudByStatus?.UNDER_REVIEW), icon: Eye },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
                  <Icon className="text-cyan-500" size={22} />
                  <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-black">{card.value}</p>
                </div>
              );
            })}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">Active cycle</h3>
              {overview.activeCycle ? statusBadge(overview.activeCycle.status) : null}
            </div>
            {overview.activeCycle ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">Pool: <span className="font-bold text-white">{inr((overview.activeCycle.poolPaise ?? 0) / 100)}</span></p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total eligible scores: <span className="font-bold text-white">{num(overview.activeCycle.totalEligibleScores)}</span></p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Released: <span className="font-bold text-emerald-300">{inr((overview.activeCycle.releasedRevenuePaise ?? 0) / 100)}</span></p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No active cycle yet.</p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-black">Configuration</h3>
              <div className="flex items-center gap-2">
                <input value={minPayout} onChange={(e) => setMinPayout(e.target.value)} inputMode="numeric" placeholder="Min payout (paise)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10" />
                <button onClick={saveConfig} disabled={busy === "config"} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950">
                  {busy === "config" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Save
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Enabled: <span className="text-white">{overview.config.enabled ? "Yes" : "No"}</span></p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">Weights</p>
                <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{JSON.stringify(overview.config.weights, null, 1)}</pre>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Normalization caps / floors</p>
                <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{JSON.stringify(overview.config.normalization, null, 1)}</pre>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {tab === "cycles" ? (
        <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <h3 className="text-lg font-black">Earning cycles</h3>
          <div className="mt-4 space-y-2">
            {(overview?.cycles ?? []).map((cycle) => (
              <div key={cycle.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black">{cycle.label}</p>
                    {statusBadge(cycle.status)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Pool {inr((cycle.poolPaise ?? 0) / 100)} · {num(cycle.totalEligibleCreators)} creators · {num(cycle.totalEligibleScores)} score</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {["refresh", "calculate", "finalize", "release"].map((action) => (
                    <button key={action} onClick={() => cycleAction(cycle.id, action)} disabled={busy === `${cycle.id}:${action}`} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black capitalize transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10">
                      {action}
                    </button>
                  ))}
                  <button onClick={() => openCycle(cycle.id)} disabled={busy === cycle.id} className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950">
                    {busy === cycle.id ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                    Details
                  </button>
                </div>
              </div>
            ))}
            {(overview?.cycles ?? []).length === 0 && <p className="py-8 text-center text-sm text-slate-500">No cycles yet. Create one via the ingest flow or the database.</p>}
          </div>

          {detail ? (
            <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="font-black">{detail.cycle.label} — snapshots</h4>
                <button onClick={() => setDetail(null)} className="text-xs font-bold text-slate-500 hover:text-white">Close ×</button>
              </div>
              <div className="mt-3 space-y-2">
                {detail.snapshots.map((snap) => (
                  <div key={snap.id} className="flex flex-col gap-2 rounded-xl bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold">{snap.creatorId}</p>
                      <p className="text-xs text-slate-500">{num(snap.qualifiedViews)} qualified views · {snap.ineligibilityReasons?.join(", ") || "eligible"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(snap.revenueState)}
                      <span className="font-black text-fuchsia-300">{snap.score?.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
                {detail.snapshots.length === 0 && <p className="text-sm text-slate-500">No snapshots yet.</p>}
              </div>

              <h4 className="mt-6 font-black">Final allocations</h4>
              <div className="mt-3 space-y-2">
                {detail.allocations.map((alloc) => (
                  <div key={alloc.id} className="flex flex-col gap-2 rounded-xl bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold">{alloc.creatorId}</p>
                      <p className="text-xs text-slate-500">Share {alloc.creatorSharePercent?.toFixed(3)}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(alloc.revenueState)}
                      <span className="font-black text-emerald-300">{inr(alloc.finalRevenuePaise / 100)}</span>
                    </div>
                  </div>
                ))}
                {detail.allocations.length === 0 && <p className="text-sm text-slate-500">No allocations yet.</p>}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "fraud" ? (
        <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">Fraud review queue</h3>
            <p className="text-xs font-bold text-slate-500">{fraudData?.cycleLabel ?? "No active cycle"} · {fraudData?.actions?.join(" / ")}</p>
          </div>
          <div className="mt-4 space-y-2">
            {(fraudData?.queue ?? []).map((row) => (
              <div key={row.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black">{row.creatorId}</p>
                    {statusBadge(row.status)}
                    {row.revenueState ? statusBadge(row.revenueState) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Risk {row.riskScore?.toFixed(2)} · {num(row.qualifiedViews)} qualified · {num(row.rejectedViews)} rejected · Score {row.score?.toFixed(1) ?? "—"}
                    {row.note ? ` · Note: ${row.note}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {fraudData?.actions?.map((action) => (
                    <button key={action} onClick={() => fraudAction(row.creatorId, action)} disabled={busy === `${row.creatorId}:${action}`} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black capitalize transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10">
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {(fraudData?.queue ?? []).length === 0 && <p className="py-8 text-center text-sm text-slate-500">No fraud reviews on record. Reviews are created when fraud signals are detected or an admin opens a review.</p>}
          </div>
        </section>
      ) : null}
    </div>
  );
}