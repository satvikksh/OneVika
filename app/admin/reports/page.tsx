"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Check,
  Eye,
  Flag,
  Loader2,
  Search,
  ShieldAlert,
  Video,
  X,
} from "lucide-react";

const statuses = ["ALL", "PENDING", "REVIEWING", "DISMISSED", "RESOLVED"];
const actions = ["review", "dismiss", "remove", "warn", "restrict", "ban"];
const destructiveActions = ["remove", "restrict", "ban"];

const ACTION_HINT: Record<string, string> = {
  review: "Flags the report so your team knows it is being worked on.",
  dismiss: "Clears the report as not actionable. A reason is required.",
  remove: "Soft-removes the content. It is hidden from all public feeds and profiles. All open reports for this content are resolved.",
  warn: "Gives the reported user a warning. A reason is required.",
  restrict: "Restricts the user. They can no longer create posts until lifted.",
  ban: "Bans the user. Their account is blocked from posting and all open reports against them are resolved.",
};

const REASONS = [
  "Spam",
  "Harassment",
  "Hate or Abuse",
  "Nudity or Sexual Content",
  "Violence",
  "Misinformation",
  "Copyright",
  "Scam or Fraud",
  "Other",
];

type ReportUser = { id: string; name: string; email: string; image?: string };

type ReportContent = {
  id: string;
  content: string;
  images: string[];
  isVideo: boolean;
  status: string;
  removedAt: string | null;
  createdAt: string | null;
};

type ReportRow = {
  id: string;
  contentType: "post" | "video";
  reason: string;
  description: string;
  status: string;
  actionTaken: string;
  reviewNote: string;
  decidedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  reportCount: number;
  reporter: ReportUser;
  reportedUser: ReportUser;
  content: ReportContent;
};

type Summary = {
  PENDING: number;
  REVIEWING: number;
  DISMISSED: number;
  RESOLVED: number;
  total: number;
};

function formatDate(value: string | null) {
  if (!value) return "-";
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
  if (status === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200";
  }
  if (status === "REVIEWING") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200";
  }
  if (status === "DISMISSED") {
    return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
}

function actionBadge(action: string) {
  if (action === "removed") {
    return "rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
  }
  if (action === "banned") {
    return "rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200";
  }
  if (action === "restricted") {
    return "rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-200";
  }
  if (action === "warned" || action === "warn") {
    return "rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-[10px] font-black text-yellow-700 dark:border-yellow-400/20 dark:bg-yellow-400/10 dark:text-yellow-200";
  }
  if (action === "review") {
    return "rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200";
  }
  return "";
}

export default function AdminReportsPage() {
  const [status, setStatus] = useState("ALL");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    PENDING: 0,
    REVIEWING: 0,
    DISMISSED: 0,
    RESOLVED: 0,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionNote, setActionNote] = useState<{ tone: "success" | "warn"; text: string } | null>(null);

  async function load(nextStatus = status) {
    setLoading(true);
    setError("");
    try {
      const query = nextStatus === "ALL" ? "" : `?status=${nextStatus}`;
      const res = await fetch(`/api/admin/reports${query}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load reports");
      setReports(payload.reports || []);
      setSummary(
        payload.summary || { PENDING: 0, REVIEWING: 0, DISMISSED: 0, RESOLVED: 0, total: 0 }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reports");
    } finally {
      setLoading(false);
    }
  }

  const loadCallback = useCallback(load, [status]);

  useEffect(() => {
    void loadCallback(status);
  }, [loadCallback, status]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      if (reasonFilter !== "ALL" && report.reason !== reasonFilter) return false;
      if (!query) return true;
      return [
        report.reason,
        report.description,
        report.status,
        report.reporter.name,
        report.reporter.email,
        report.reportedUser.name,
        report.reportedUser.email,
        report.content.content,
        report.id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [reasonFilter, reports, search]);

  function openDecision(action: string) {
    setDecision(action);
    setReason("");
    setConfirmArmed(false);
    setActionError("");
    setActionNote(null);
  }

  async function submitDecision() {
    if (!selected || !decision) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setActionError("A reason is required. Describe why you are taking this action.");
      return;
    }
    if (destructiveActions.includes(decision) && !confirmArmed) {
      setActionError("Confirm the checkbox to apply this destructive action.");
      return;
    }
    setSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/reports/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: decision, reason: trimmed }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to apply action");
      const email = payload.email;
      if (email && !email.delivered) {
        setActionNote({ tone: "warn", text: `Action applied. Notification email could not be sent (${email.error || "delivery failed"}).` });
      } else if (email && email.delivered) {
        setActionNote({ tone: "success", text: "Action applied. Notification email sent to the affected user." });
      } else {
        setActionNote(null);
      }
      setSelected(null);
      setDecision(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to apply action");
    } finally {
      setSubmitting(false);
    }
  }

  const previewImage = (content: ReportContent) => {
    if (content.images && content.images.length > 0) {
      return content.images[0];
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Trust and safety</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Reports</h2>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Pending", value: summary.PENDING, tone: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200" },
          { label: "In review", value: summary.REVIEWING, tone: "bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200" },
          { label: "Dismissed", value: summary.DISMISSED, tone: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" },
          { label: "Resolved", value: summary.RESOLVED, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200" },
          { label: "Shown", value: reports.length, tone: "bg-slate-950 text-white dark:bg-white dark:text-slate-950" },
        ].map((pill) => (
          <div
            key={pill.label}
            className={`flex items-center justify-between gap-2 rounded-2xl border border-slate-200/60 px-4 py-3 dark:border-white/10 ${pill.tone}`}
          >
            <span className="text-xs font-black uppercase tracking-wide">{pill.label}</span>
            <span className="text-xl font-black tabular-nums">{pill.value}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/75 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {statuses.map((item) => (
            <button
              key={item}
              onClick={() => setStatus(item)}
              className={`rounded-2xl px-3 py-2 text-xs font-black transition sm:text-sm ${
                status === item
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "border border-slate-200 bg-white text-slate-600 hover:text-slate-950 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/10">
          <Search size={17} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reason, description, reporter, creator, content"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={reasonFilter}
          onChange={(event) => setReasonFilter(event.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/10"
        >
          <option value="ALL">All reasons</option>
          {REASONS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
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
            <Flag size={17} /> {filtered.length} {filtered.length === 1 ? "report" : "reports"}
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Showing the 250 most recent reports</p>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldAlert className="mx-auto text-slate-400" />
            <h3 className="mt-4 text-lg font-black">No reports found</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the filters or check another status.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1280px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black">Reason</th>
                    <th className="px-4 py-3 text-xs font-black">Content</th>
                    <th className="px-4 py-3 text-xs font-black">Reporting user</th>
                    <th className="px-4 py-3 text-xs font-black">Reported user</th>
                    <th className="px-4 py-3 text-xs font-black">Count</th>
                    <th className="px-4 py-3 text-xs font-black">Status</th>
                    <th className="px-4 py-3 text-xs font-black">Submitted</th>
                    <th className="px-4 py-3 text-xs font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900 dark:divide-white/10 dark:text-white">
                  {filtered.map((report) => (
                    <tr key={report.id} className="transition hover:bg-slate-50/80 dark:hover:bg-white/[0.04]">
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                          {report.reason}
                        </span>
                        {report.actionTaken ? (
                          <span className={`ml-1 inline-flex whitespace-nowrap ${actionBadge(report.actionTaken)}`}>
                            {report.actionTaken}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-start gap-2.5">
                          {previewImage(report.content) && report.content.status === "active" ? (
                            <Image
                              src={previewImage(report.content) as string}
                              alt=""
                              width={48}
                              height={48}
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5">
                              {report.content.isVideo ? <Video size={18} /> : <Flag size={18} />}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[280px] truncate text-[13px] font-semibold">
                              {report.content.content || "(no caption)"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {report.content.isVideo ? "Video" : "Post"}
                              {report.content.status === "removed" ? " · removed" : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="max-w-[180px] truncate font-black leading-snug">{report.reporter.name}</p>
                        <p className="mt-1 max-w-[200px] break-all text-[11px] leading-snug text-slate-500">{report.reporter.email}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="max-w-[180px] truncate font-black leading-snug">{report.reportedUser.name}</p>
                        <p className="mt-1 max-w-[200px] break-all text-[11px] leading-snug text-slate-500">{report.reportedUser.email}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top">
                        <span className="inline-grid h-7 min-w-7 place-items-center rounded-full border border-slate-200 px-2 text-xs font-black tabular-nums dark:border-white/10">
                          {report.reportCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-xs">{formatDate(report.createdAt)}</td>
                      <td className="px-4 py-4 align-top">
                        <button
                          onClick={() => setSelected(report)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-[11px] font-black text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {filtered.map((report, index) => (
                <motion.article
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                        {report.reason}
                      </span>
                      {report.content.isVideo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500"><Video size={12} /> Video</span>
                      ) : null}
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClass(report.status)}`}>{report.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <p><span className="text-slate-500">Reporting user</span><br /><b className="break-all">{report.reporter.name}</b></p>
                    <p><span className="text-slate-500">Reported user</span><br /><b className="break-all">{report.reportedUser.name}</b></p>
                    <p className="col-span-2"><span className="text-slate-500">Content</span><br /><b>{report.content.content || "(no caption)"}</b></p>
                    <p><span className="text-slate-500">Reports on content</span><br /><b className="tabular-nums">{report.reportCount}</b></p>
                    <p><span className="text-slate-500">Submitted</span><br /><b>{formatDate(report.createdAt)}</b></p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setSelected(report)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-[11px] font-black dark:border-white/10"
                    >
                      <Eye size={14} /> Review report
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </>
        )}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <Flag className="text-rose-500" size={20} />
                <div>
                  <h3 className="text-xl font-black">Report details</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">{selected.id}</p>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setDecision(null); }} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-3 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                  {selected.contentType === "video" ? "Video" : "Post"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                  {selected.reason}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClass(selected.status)}`}>
                  {selected.status}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black tabular-nums text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                  {selected.reportCount} {selected.reportCount === 1 ? "report" : "reports"}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Reported content</p>
                <div className="mt-3 flex items-start gap-3">
                  {previewImage(selected.content) && selected.content.status === "active" ? (
                    <Image
                      src={previewImage(selected.content) as string}
                      alt=""
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5">
                      {selected.content.isVideo ? <Video size={26} /> : <Flag size={26} />}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{selected.content.content || "(no caption)"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.content.isVideo ? `${selected.content.images.length} media item(s)` : `${selected.content.images.length} media item(s)`}
                    </p>
                    {selected.content.status === "removed" ? (
                      <span className="mt-2 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                        Content hidden · {formatDate(selected.content.removedAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Reporting user</p>
                  <p className="mt-2 font-black">{selected.reporter.name}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{selected.reporter.email}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Reported user</p>
                  <p className="mt-2 font-black">{selected.reportedUser.name}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{selected.reportedUser.email}</p>
                </div>
              </div>

              {selected.description ? (
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Reporter notes</p>
                  <p className="mt-2 text-sm leading-relaxed">{selected.description}</p>
                </div>
              ) : null}

              <div className="grid gap-2 text-xs">
                <p><span className="text-slate-500">Submitted</span> <b>{formatDate(selected.createdAt)}</b></p>
                <p><span className="text-slate-500">Last updated</span> <b>{formatDate(selected.updatedAt)}</b></p>
                {selected.reviewNote ? (
                  <p><span className="text-slate-500">Decision note</span> <b>{selected.reviewNote}</b></p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Take action</p>

                {!decision ? (
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <button
                        key={action}
                        onClick={() => openDecision(action)}
                        disabled={selected.status === "DISMISSED" || (selected.status === "RESOLVED" && action !== "review")}
                        className={`rounded-xl px-3 py-2 text-xs font-black capitalize transition disabled:opacity-40 ${
                          action === "remove" || action === "restrict" || action === "ban"
                            ? "border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-300 dark:hover:bg-rose-400/10"
                            : action === "warn" || action === "review"
                              ? "border border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-300 dark:hover:bg-amber-400/10"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                        }`}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black capitalize">Apply: {decision}</p>
                      <button onClick={() => setDecision(null)} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        Back
                      </button>
                    </div>
                    <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs leading-relaxed text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                      {ACTION_HINT[decision]}
                    </p>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={3}
                      placeholder="Reason for this decision (required) — will be saved to the audit log."
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/10"
                    />
                    {destructiveActions.includes(decision) ? (
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                        <input
                          type="checkbox"
                          checked={confirmArmed}
                          onChange={(event) => setConfirmArmed(event.target.checked)}
                          className="mt-0.5"
                        />
                        I understand this is a destructive action that cannot be undone.
                      </label>
                    ) : null}
                    {actionError ? (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                        {actionError}
                      </p>
                    ) : null}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={submitDecision}
                        disabled={submitting}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black text-white disabled:opacity-60 ${
                          destructiveActions.includes(decision) ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-950 hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                        }`}
                      >
                        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                        {submitting ? "Applying..." : `Confirm ${decision}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {actionNote ? (
        <div className={`fixed bottom-4 right-4 z-[60] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl sm:bottom-6 sm:right-6 ${
          actionNote.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/90 dark:text-emerald-200"
            : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-950/90 dark:text-amber-200"
        }`}>
          {actionNote.tone === "success" ? <Check size={16} className="shrink-0" /> : <ShieldAlert size={16} className="shrink-0" />}
          <span className="max-w-xs">{actionNote.text}</span>
          <button onClick={() => setActionNote(null)} className="ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"><X size={15} /></button>
        </div>
      ) : null}
    </div>
  );
}