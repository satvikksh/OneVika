"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FileClock, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";

type AuditLog = {
  id: string;
  admin: string;
  action: string;
  targetId: string;
  description: string;
  createdAt: string | null;
};

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/audit-log", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load audit logs");
      setLogs(payload.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter((log) => `${log.admin} ${log.action} ${log.targetId} ${log.description}`.toLowerCase().includes(query));
  }, [logs, search]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Security trail</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Audit logs</h2>
        </div>
        <button onClick={load} className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black shadow-sm dark:border-white/10 dark:bg-white/10">
          <RefreshCw size={16} /> Refresh
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/10">
            <Search size={17} className="text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search admin, action, target" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <div className="flex items-center gap-2 text-sm font-black text-slate-500 dark:text-slate-400">
            <ShieldCheck size={17} /> {filtered.length} entries
          </div>
        </div>

        {error ? (
          <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</div>
        ) : null}

        {loading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <FileClock className="mx-auto text-slate-400" />
            <h3 className="mt-4 text-lg font-black">No audit entries</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Admin actions will appear here when recorded.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {filtered.map((log) => {
              const open = expanded === log.id;
              return (
                <article key={log.id} className="p-4 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.04]">
                  <button onClick={() => setExpanded(open ? "" : log.id)} className="flex w-full items-center justify-between gap-4 text-left">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">SUCCESS</span>
                        <h3 className="font-black">{log.action}</h3>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{log.description}</p>
                    </div>
                    <div className="hidden text-right text-xs font-semibold text-slate-500 sm:block">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : "-"}
                    </div>
                    <ChevronDown className={`shrink-0 transition ${open ? "rotate-180" : ""}`} size={18} />
                  </button>
                  {open ? (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
                      <p><span className="text-slate-500">Admin</span><br /><b>{log.admin}</b></p>
                      <p><span className="text-slate-500">Timestamp</span><br /><b>{log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : "-"}</b></p>
                      <p className="sm:col-span-2"><span className="text-slate-500">Target</span><br /><b className="break-all">{log.targetId || "-"}</b></p>
                      <p className="sm:col-span-2"><span className="text-slate-500">Device/IP</span><br /><b>Unavailable</b></p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
