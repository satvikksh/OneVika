"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Eye, Filter, Loader2, Search, ShieldAlert, X } from "lucide-react";

const statuses = ["ALL", "PENDING", "APPROVED", "PROCESSING", "COMPLETED", "FAILED", "REJECTED", "REVERSED"];
const actions = ["approve", "process", "complete", "reject", "fail", "reverse"];

type AdminWithdrawal = {
  id: string;
  user: { name: string; email: string };
  amount: number;
  eligibleLikes: number;
  payoutMethod?: string;
  payoutDetailsMasked: string;
  status: string;
  withdrawalId?: string;
  providerPayoutId?: string;
  createdAt: string | null;
  failureReason?: string;
  adminNote?: string;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

function formatRequested(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function statusClass(status: string) {
  if (status === "COMPLETED" || status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
  if (status === "PENDING" || status === "PROCESSING") return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200";
  if (status === "FAILED" || status === "REJECTED" || status === "REVERSED") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300";
}

export default function AdminWithdrawalsPage() {
  const [status, setStatus] = useState("PENDING");
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");
  const [selected, setSelected] = useState<AdminWithdrawal | null>(null);

  async function load(nextStatus = status) {
    setLoading(true);
    setError("");
    try {
      const query = nextStatus === "ALL" ? "" : `?status=${nextStatus}`;
      const res = await fetch(`/api/admin/withdrawals${query}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load withdrawals");
      setWithdrawals(payload.withdrawals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load withdrawals");
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: string) {
    const confirmed = window.confirm(`Confirm ${action} for this withdrawal?`);
    if (!confirmed) return;

    setActingId(`${id}:${action}`);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to update withdrawal");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update withdrawal");
    } finally {
      setActingId("");
    }
  }

  useEffect(() => {
    void load(status);
  }, [status]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = amountMin ? Number(amountMin) : null;
    const max = amountMax ? Number(amountMax) : null;

    return withdrawals.filter((withdrawal) => {
      const haystack = `${withdrawal.user.name} ${withdrawal.user.email} ${withdrawal.status} ${withdrawal.payoutDetailsMasked}`.toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (min !== null && withdrawal.amount < min) return false;
      if (max !== null && withdrawal.amount > max) return false;
      return true;
    });
  }, [amountMax, amountMin, search, withdrawals]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Payout operations</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Withdrawal management</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((item) => (
            <button
              key={item}
              onClick={() => setStatus(item)}
              className={`rounded-2xl px-3 py-2 text-xs font-black transition sm:text-sm ${
                status === item ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "border border-slate-200 bg-white text-slate-600 hover:text-slate-950 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] lg:grid-cols-[1fr_160px_160px]">
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/10">
          <Search size={17} className="text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search creator, email, status, payout" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <input value={amountMin} onChange={(event) => setAmountMin(event.target.value)} type="number" placeholder="Min amount" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none dark:border-white/10 dark:bg-white/10" />
        <input value={amountMax} onChange={(event) => setAmountMax(event.target.value)} type="number" placeholder="Max amount" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none dark:border-white/10 dark:bg-white/10" />
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Admin note, rejection reason, or failure reason" className="min-h-20 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/10 lg:col-span-3" />
      </section>

      {error ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold">{error}</span>
          <button onClick={() => load()} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white">Retry</button>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm font-black">
            <Filter size={17} /> {filtered.length} records
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payout details are masked</p>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Clock className="mx-auto text-slate-400" />
            <h3 className="mt-4 text-lg font-black">No withdrawals found</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust filters or check another status.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1360px] text-left text-sm">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[15%]" />
                  <col className="w-[13%]" />
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50 uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black">Creator</th>
                    <th className="px-4 py-3 text-right text-xs font-black">Amount</th>
                    <th className="px-4 py-3 text-xs font-black">Status</th>
                    <th className="px-4 py-3 text-xs font-black">Payment method</th>
                    <th className="px-4 py-3 text-xs font-black">Requested</th>
                    <th className="px-4 py-3 text-xs font-black">Transaction ID</th>
                    <th className="px-4 py-3 text-xs font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900 dark:divide-white/10 dark:text-white">
                  {filtered.map((withdrawal) => (
                    <tr key={withdrawal.id} className="transition hover:bg-slate-50/80 dark:hover:bg-white/[0.04]">
                      <td className="px-4 py-4 align-top">
                        <p className="font-black leading-snug">{withdrawal.user.name}</p>
                        {withdrawal.user.email ? (
                          <p className="mt-1 max-w-[240px] break-all text-[11px] leading-snug text-slate-500">{withdrawal.user.email}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-right align-top">
                        <p className="whitespace-nowrap font-black tabular-nums">{currency(withdrawal.amount)}</p>
                        <p className="mt-1 whitespace-nowrap text-[11px] font-semibold text-slate-500">{withdrawal.eligibleLikes} eligible likes</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(withdrawal.status)}`}>{withdrawal.status}</span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-xs font-bold uppercase tracking-wide">{withdrawal.payoutMethod || "—"}</p>
                        {withdrawal.payoutDetailsMasked ? (
                          <p className="mt-1 max-w-[220px] break-all text-[11px] leading-snug text-slate-500">{withdrawal.payoutDetailsMasked}</p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-xs">{withdrawal.createdAt ? formatRequested(withdrawal.createdAt) : "-"}</td>
                      <td className="px-4 py-4 align-top">
                        <p className="max-w-[220px] break-all font-mono text-[11px] leading-snug text-slate-600 dark:text-slate-300">{withdrawal.providerPayoutId || withdrawal.withdrawalId || withdrawal.id}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button onClick={() => setSelected(withdrawal)} className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="View withdrawal details" title="View details">
                            <Eye size={15} />
                          </button>
                          {actions.map((action) => (
                            <button key={action} onClick={() => act(withdrawal.id, action)} disabled={Boolean(actingId)} className="rounded-xl bg-slate-950 px-2.5 py-2 text-[11px] font-black text-white capitalize transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                              {actingId === `${withdrawal.id}:${action}` ? <Loader2 className="animate-spin" size={14} /> : action}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {filtered.map((withdrawal, index) => (
                <motion.article key={withdrawal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{withdrawal.user.name}</h3>
                      <p className="text-xs text-slate-500">{withdrawal.user.email}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClass(withdrawal.status)}`}>{withdrawal.status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <p><span className="text-slate-500">Amount</span><br /><b className="tabular-nums">{currency(withdrawal.amount)}</b></p>
                    <p><span className="text-slate-500">Likes</span><br /><b>{withdrawal.eligibleLikes}</b></p>
                    <p><span className="text-slate-500">Payment method</span><br /><b>{withdrawal.payoutMethod || "—"}</b></p>
                    <p><span className="text-slate-500">Requested</span><br /><b>{withdrawal.createdAt ? formatRequested(withdrawal.createdAt) : "-"}</b></p>
                    <p className="col-span-2"><span className="text-slate-500">Payout</span><br /><b className="break-all">{withdrawal.payoutDetailsMasked}</b></p>
                    <p className="col-span-2"><span className="text-slate-500">Transaction ID</span><br /><b className="break-all font-mono text-xs">{withdrawal.providerPayoutId || withdrawal.withdrawalId || withdrawal.id}</b></p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <button onClick={() => setSelected(withdrawal)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-[11px] font-black dark:border-white/10"><Eye size={14} /> Details</button>
                    {actions.map((action) => (
                      <button key={action} onClick={() => act(withdrawal.id, action)} disabled={Boolean(actingId)} className="rounded-xl bg-slate-950 px-2.5 py-2 text-[11px] font-black capitalize text-white disabled:opacity-60 dark:bg-white dark:text-slate-950">{actingId === `${withdrawal.id}:${action}` ? <Loader2 className="animate-spin" size={14} /> : action}</button>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>
          </>
        )}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">Withdrawal details</h3>
                <p className="mt-1 text-sm text-slate-500">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
            </div>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <p><span className="text-slate-500">Creator</span><br /><b>{selected.user.name}</b></p>
              <p><span className="text-slate-500">Email</span><br /><b>{selected.user.email}</b></p>
              <p><span className="text-slate-500">Amount</span><br /><b>{currency(selected.amount)}</b></p>
              <p><span className="text-slate-500">Status</span><br /><b>{selected.status}</b></p>
              <p><span className="text-slate-500">Payment method</span><br /><b>{selected.payoutMethod || "-"}</b></p>
              <p><span className="text-slate-500">Requested date</span><br /><b>{selected.createdAt ? formatRequested(selected.createdAt) : "-"}</b></p>
              <p className="sm:col-span-2"><span className="text-slate-500">Transaction ID</span><br /><b className="break-all">{selected.providerPayoutId || selected.withdrawalId || selected.id}</b></p>
              <p className="sm:col-span-2"><span className="text-slate-500">Payout</span><br /><b>{selected.payoutDetailsMasked}</b></p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black dark:border-white/10"><ShieldAlert size={16} /> Close</button>
              <button onClick={() => act(selected.id, "approve")} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white"><Check size={16} /> Approve</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
