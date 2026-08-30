"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  FileText,
  Flag,
  Heart,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";

const TYPE_FILTERS = [
  { value: "ALL", label: "All content" },
  { value: "post", label: "Posts" },
  { value: "video", label: "Videos" },
];

const STATUS_FILTERS = [
  { value: "ALL", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "removed", label: "Hidden" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "likes", label: "Most liked" },
  { value: "comments", label: "Most commented" },
];

const REPORT_ACTIONS = ["review", "dismiss", "remove", "warn", "restrict", "ban"];
const DESTRUCTIVE_ACTIONS = ["remove", "restrict", "ban"];

const ACTION_HINT: Record<string, string> = {
  review: "Flags the report so your team knows it is being worked on.",
  dismiss: "Clears the report as not actionable. A reason is required.",
  remove: "Soft-removes the content. Hidden from all public feeds and profiles. All open reports for this content are resolved.",
  warn: "Gives the reported user a warning. A reason is required.",
  restrict: "Restricts the user. They can no longer create posts until lifted.",
  ban: "Bans the user. Their account is blocked from posting and all open reports against them are resolved.",
};

type AdminCreator = {
  id: string;
  name: string;
  email: string;
  image: string;
  accountStatus: string;
  isPremium: boolean;
  createdAt: string | null;
};

type AdminPost = {
  id: string;
  contentType: "post" | "video";
  isVideo: boolean;
  content: string;
  images: string[];
  status: "active" | "removed";
  likeCount: number;
  commentCount: number;
  reportCount: number;
  openReportCount: number;
  removedAt: string | null;
  removalReason: string;
  createdAt: string | null;
  updatedAt: string | null;
  creator: AdminCreator | null;
};

type ReportRow = {
  id: string;
  contentType: string;
  reason: string;
  description: string;
  status: string;
  actionTaken: string;
  reviewNote: string;
  contentId: string;
  reporter: {
    id: string;
    name: string;
    email: string;
    image: string;
  };
  createdAt: string | null;
  decidedAt: string | null;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

type Summary = {
  total: number;
  posts: number;
  videos: number;
  active: number;
  removed: number;
  reportedContent: number;
  openReports: number;
};

const EMPTY_SUMMARY: Summary = {
  total: 0,
  posts: 0,
  videos: 0,
  active: 0,
  removed: 0,
  reportedContent: 0,
  openReports: 0,
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

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function postStatusClass(status: string) {
  if (status === "removed") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
}

function reportStatusClass(status: string) {
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

function accountStatusClass(status: string) {
  if (status === "banned") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200";
  }
  if (status === "restricted") {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-200";
  }
  if (status === "warned") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-400/20 dark:bg-yellow-400/10 dark:text-yellow-200";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
}

export default function AdminPostsPage() {
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detail, setDetail] = useState<{ post: AdminPost; reports: ReportRow[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailTab, setDetailTab] = useState<"content" | "reports">("content");

  const [confirm, setConfirm] = useState<{ post: AdminPost; mode: "hide" | "restore" } | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const [reportTarget, setReportTarget] = useState<ReportRow | null>(null);
  const [reportAction, setReportAction] = useState<string>("");
  const [reportReason, setReportReason] = useState("");
  const [reportArmed, setReportArmed] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");

  const [toast, setToast] = useState<{ tone: "success" | "warn"; text: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(page),
        type: typeFilter,
        status: statusFilter,
        sort,
        search,
      });
      const res = await fetch(`/api/admin/posts?${qs}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load posts");
      setPosts(payload.posts || []);
      setSummary(payload.summary || EMPTY_SUMMARY);
      if (payload.pagination) setPagination(payload.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load posts");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, sort, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, sort, search]);

  const loadDetail = useCallback(async (postId: string) => {
    setLoadingDetail(true);
    setDetailError("");
    setDetailTab("content");
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load content");
      setDetail({ post: payload.post, reports: payload.reports || [] });
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Unable to load content");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  async function submitPostAction() {
    if (!confirm) return;
    const trimmed = confirmReason.trim();
    if (confirm.mode === "hide" && !trimmed) {
      setConfirmError("A removal reason is required.");
      return;
    }
    if (confirm.mode === "hide" && !confirmArmed) {
      setConfirmError("Confirm the checkbox to hide this content.");
      return;
    }
    setConfirmSubmitting(true);
    setConfirmError("");
    try {
      const res = await fetch(`/api/admin/posts/${confirm.post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirm.mode,
          reason: trimmed,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to update content");
      const email = payload.email;
      if (email && !email.delivered) {
        setToast({ tone: "warn", text: `${confirm.mode === "hide" ? "Content hidden" : "Content restored"}. Email notification could not be sent (${email.error || "delivery failed"}).` });
      } else {
        setToast({ tone: "success", text: `${confirm.mode === "hide" ? "Content hidden from all public feeds" : "Content restored and visible again"}. Account email notification sent.` });
      }
      setConfirm(null);
      await loadDetail(confirm.post.id);
      await load();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Unable to update content");
    } finally {
      setConfirmSubmitting(false);
    }
  }

  function openReportAction(report: ReportRow, action: string) {
    setReportTarget(report);
    setReportAction(action);
    setReportReason("");
    setReportArmed(false);
    setReportError("");
  }

  function closeReportAction() {
    setReportTarget(null);
    setReportAction("");
    setReportReason("");
    setReportArmed(false);
    setReportError("");
  }

  async function submitReportAction() {
    if (!reportTarget || !reportAction) return;
    const trimmed = reportReason.trim();
    if (!trimmed) {
      setReportError("A reason is required. Describe why you are taking this action.");
      return;
    }
    if (DESTRUCTIVE_ACTIONS.includes(reportAction) && !reportArmed) {
      setReportError("Confirm the checkbox to apply this destructive action.");
      return;
    }
    setReportSubmitting(true);
    setReportError("");
    try {
      const res = await fetch(`/api/admin/reports/${reportTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: reportAction, reason: trimmed }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to apply action");
      const email = payload.email;
      if (email && !email.delivered) {
        setToast({ tone: "warn", text: `Action applied. Notification email could not be sent (${email.error || "delivery failed"}).` });
      } else if (email && email.delivered) {
        setToast({ tone: "success", text: "Action applied. Notification email sent to the affected user." });
      } else {
        setToast({ tone: "success", text: "Report updated." });
      }
      closeReportAction();
      if (detail) await loadDetail(detail.post.id);
      await load();
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Unable to apply action");
    } finally {
      setReportSubmitting(false);
    }
  }

  const previewImage = (post: AdminPost) => (post.images.length > 0 ? post.images[0] : null);

  const statCards = useMemo(
    () => [
      { label: "Total content", value: summary.total, tone: "bg-slate-950 text-white dark:bg-white dark:text-slate-950" },
      { label: "Posts", value: summary.posts, tone: "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200" },
      { label: "Videos / Reels", value: summary.videos, tone: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200" },
      { label: "Active", value: summary.active, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200" },
      { label: "Hidden", value: summary.removed, tone: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200" },
      { label: "Reported content", value: summary.reportedContent, tone: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200" },
      { label: "Open reports", value: summary.openReports, tone: "bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200" },
    ],
    [summary]
  );

  function actionButtons(post: AdminPost) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => void loadDetail(post.id)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-[11px] font-black text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Eye size={14} /> View
        </button>
        {post.status === "removed" ? (
          <button
            onClick={() => { setConfirmReason(""); setConfirmArmed(false); setConfirmError(""); setConfirm({ post, mode: "restore" }); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 px-2.5 py-2 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-400/20 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
          >
            <RotateCcw size={14} /> Restore
          </button>
        ) : (
          <button
            onClick={() => { setConfirmReason(""); setConfirmArmed(false); setConfirmError(""); setConfirm({ post, mode: "hide" }); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-2.5 py-2 text-[11px] font-black text-rose-700 transition hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-300 dark:hover:bg-rose-400/10"
          >
            <Trash2 size={14} /> Remove
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Content operations</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Posts & Videos</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Review, search, and moderate every post and video on OrbitByte. Removed content is hidden from all public feeds and can be restored at any time.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black shadow-sm dark:border-white/10 dark:bg-white/10">
          <RefreshCw size={16} /> Refresh
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card) => (
          <div key={card.label} className={`flex items-center justify-between gap-2 rounded-2xl border border-slate-200/60 px-4 py-3 dark:border-white/10 ${card.tone}`}>
            <span className="text-xs font-black uppercase tracking-wide">{card.label}</span>
            <span className="text-xl font-black tabular-nums">{card.value}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/75 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setTypeFilter(item.value)}
              className={`rounded-2xl px-3 py-2 text-xs font-black transition sm:text-sm ${
                typeFilter === item.value
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "border border-slate-200 bg-white text-slate-600 hover:text-slate-950 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/10"
        >
          {STATUS_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/10"
        >
          {SORT_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/10">
          <Search size={17} className="text-slate-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search caption, creator name, email, or content ID"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </section>

      {error ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold">{error}</span>
          <button onClick={() => void load()} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white">Retry</button>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm font-black">
            {typeFilter === "video" ? <Video size={17} /> : typeFilter === "post" ? <FileText size={17} /> : <ShieldAlert size={17} />}
            {pagination.total} {pagination.total === 1 ? "item" : "items"}
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Page {pagination.page} of {pagination.totalPages} · {pagination.limit} per page
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldAlert className="mx-auto text-slate-400" />
            <h3 className="mt-4 text-lg font-black">No content found</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the filters or search to see content.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1240px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black">Content</th>
                    <th className="px-4 py-3 text-xs font-black">Creator</th>
                    <th className="px-4 py-3 text-xs font-black">Engagement</th>
                    <th className="px-4 py-3 text-xs font-black">Reports</th>
                    <th className="px-4 py-3 text-xs font-black">Status</th>
                    <th className="px-4 py-3 text-xs font-black">Created</th>
                    <th className="px-4 py-3 text-xs font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900 dark:divide-white/10 dark:text-white">
                  {posts.map((post) => (
                    <tr key={post.id} className="transition hover:bg-slate-50/80 dark:hover:bg-white/[0.04]">
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-start gap-2.5">
                          {previewImage(post) && post.status === "active" ? (
                            post.isVideo ? (
                              <video src={previewImage(post) as string} muted playsInline preload="metadata" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                            ) : (
                              <Image
                                src={previewImage(post) as string}
                                alt=""
                                width={48}
                                height={48}
                                className="h-12 w-12 shrink-0 rounded-lg object-cover"
                              />
                            )
                          ) : (
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5">
                              {post.isVideo ? <Video size={18} /> : <FileText size={18} />}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[280px] truncate text-[13px] font-semibold">{post.content || "(no caption)"}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {post.isVideo ? "Video" : "Post"}
                              {post.images.length > 1 ? ` · ${post.images.length} media` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="max-w-[170px] truncate font-black leading-snug">{post.creator?.name || "Unknown"}</p>
                        <p className="mt-1 max-w-[200px] break-all text-[11px] leading-snug text-slate-500">{post.creator?.email || "No email"}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-3 whitespace-nowrap text-xs font-black tabular-nums">
                          <span className="inline-flex items-center gap-1"><Heart size={13} className="text-rose-500" /> {formatCount(post.likeCount)}</span>
                          <span className="inline-flex items-center gap-1"><MessageCircle size={13} className="text-cyan-500" /> {formatCount(post.commentCount)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-grid h-7 min-w-7 place-items-center rounded-full border border-slate-200 px-2 text-xs font-black tabular-nums dark:border-white/10">
                            {post.reportCount}
                          </span>
                          {post.openReportCount > 0 ? (
                            <span className="inline-flex whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                              {post.openReportCount} open
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-black ${postStatusClass(post.status)}`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-xs">{formatDate(post.createdAt)}</td>
                      <td className="px-4 py-4 align-top">{actionButtons(post)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {posts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/10"
                >
                  <div className="flex items-start gap-3">
                    {previewImage(post) && post.status === "active" ? (
                      post.isVideo ? (
                        <video src={previewImage(post) as string} muted playsInline preload="metadata" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <Image
                          src={previewImage(post) as string}
                          alt=""
                          width={64}
                          height={64}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                        />
                      )
                    ) : (
                      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5">
                        {post.isVideo ? <Video size={24} /> : <FileText size={24} />}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                          {post.isVideo ? "Video" : "Post"}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-black ${postStatusClass(post.status)}`}>{post.status}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold">{post.content || "(no caption)"}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <p className="col-span-2"><span className="text-slate-500">Creator</span><br /><b className="break-all">{post.creator?.name || "Unknown"}</b></p>
                    <p><span className="text-slate-500">Likes</span><br /><b className="tabular-nums">{formatCount(post.likeCount)}</b></p>
                    <p><span className="text-slate-500">Comments</span><br /><b className="tabular-nums">{formatCount(post.commentCount)}</b></p>
                    <p><span className="text-slate-500">Reports</span><br /><b className="tabular-nums">{post.reportCount}{post.openReportCount > 0 ? ` (${post.openReportCount} open)` : ""}</b></p>
                    <p><span className="text-slate-500">Created</span><br /><b>{formatDate(post.createdAt)}</b></p>
                  </div>
                  <div className="mt-4">{actionButtons(post)}</div>
                </motion.article>
              ))}
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-white/10 sm:flex-row">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}
      </section>

      {toast ? (
        <div className={`fixed bottom-4 right-4 z-[60] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl sm:bottom-6 sm:right-6 ${
          toast.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/90 dark:text-emerald-200"
            : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-950/90 dark:text-amber-200"
        }`}>
          {toast.tone === "success" ? <Check size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
          <span className="max-w-xs">{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"><X size={15} /></button>
        </div>
      ) : null}

      {detail ? renderDetail() : null}

      {confirm ? renderConfirm() : null}
    </div>
  );

  function renderDetail() {
    if (!detail) return null;
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              {detail.post.isVideo ? <Video className="text-violet-500" size={20} /> : <FileText size={20} />}
              <div>
                <h3 className="text-xl font-black">{detail.post.isVideo ? "Video details" : "Post details"}</h3>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">{detail.post.id}</p>
              </div>
            </div>
            <button onClick={() => setDetail(null)} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
              {detail.post.isVideo ? "Video / Reel" : "Post"}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${postStatusClass(detail.post.status)}`}>
              {detail.post.status}
            </span>
            {detail.post.creator ? (
              <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${accountStatusClass(detail.post.creator.accountStatus)}`}>
                Creator · {detail.post.creator.accountStatus}
              </span>
            ) : null}
            {detail.post.creator?.isPremium ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                Premium
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex gap-2 rounded-2xl border border-slate-200 p-1 dark:border-white/10">
            {(["content", "reports"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-black capitalize transition ${
                  detailTab === tab ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab === "content" ? "Content" : `Reports (${detail.reports.length})`}
              </button>
            ))}
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {loadingDetail ? (
              <div className="grid gap-3">
                {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />)}
              </div>
            ) : detailError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                {detailError}
              </div>
            ) : detailTab === "content" ? (
              <>
                {renderContentMedia()}
                {renderStats()}
                {renderCreator()}
                {detail.post.status === "removed" ? renderRemovalInfo() : null}
                {renderModerationActions()}
              </>
            ) : (
              renderReportsTab()
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderContentMedia() {
    if (!detail) return null;
    const { post } = detail;
    const media = post.images;
    const first = media[0];
    return (
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Content preview</p>
        {first ? (
          post.isVideo ? (
            <video controls preload="metadata" className="mt-3 max-h-72 w-full rounded-2xl bg-slate-950" src={first} />
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {media.slice(0, 4).map((url, index) => (
                <Image key={`${url}-${index}`} src={url} alt="" width={128} height={128} className="h-32 w-32 rounded-2xl object-cover" />
              ))}
              {media.length > 4 ? (
                <span className="grid h-32 w-32 place-items-center rounded-2xl border border-slate-200 bg-slate-100 text-sm font-black text-slate-500 dark:border-white/10 dark:bg-white/5">
                  +{media.length - 4}
                </span>
              ) : null}
            </div>
          )
        ) : (
          <span className="mt-3 grid h-40 w-full place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5">
            <FileText size={28} />
          </span>
        )}
        <p className="mt-3 text-sm font-semibold leading-relaxed">{post.content || "(no caption)"}</p>
      </div>
    );
  }

  function renderStats() {
    if (!detail) return null;
    const { post } = detail;
    return (
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Likes", value: formatCount(post.likeCount), icon: <Heart size={16} className="mx-auto text-rose-500" /> },
          { label: "Comments", value: formatCount(post.commentCount), icon: <MessageCircle size={16} className="mx-auto text-cyan-500" /> },
          { label: "Reports", value: formatCount(post.reportCount), icon: <Flag size={16} className="mx-auto text-amber-500" /> },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            {item.icon}
            <p className="mt-2 text-2xl font-black tabular-nums">{item.value}</p>
            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>
    );
  }

  function renderCreator() {
    if (!detail) return null;
    const { post } = detail;
    const creator = post.creator;
    if (!creator) return null;
    return (
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {creator.image ? (
              <Image src={creator.image} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <UserRound size={20} />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-black leading-snug">{creator.name}</p>
              <p className="mt-0.5 break-all text-xs text-slate-500">{creator.email || "No email on file"}</p>
              <p className="mt-1 text-[11px] text-slate-400">Joined {formatDate(creator.createdAt)}</p>
            </div>
          </div>
          <a
            href={`/profile/${creator.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-[11px] font-black text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <ExternalLink size={14} /> View profile
          </a>
        </div>
      </div>
    );
  }

  function renderRemovalInfo() {
    if (!detail) return null;
    const { post } = detail;
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm dark:border-rose-400/20 dark:bg-rose-400/10">
        <p className="text-xs font-black uppercase tracking-wide text-rose-700 dark:text-rose-200">Removal details</p>
        <div className="mt-2 grid gap-2 text-xs">
          <p><span className="text-rose-600/80 dark:text-rose-200/70">Hidden</span> <b className="text-rose-800 dark:text-rose-100">{formatDate(post.removedAt)}</b></p>
          <p><span className="text-rose-600/80 dark:text-rose-200/70">Reason</span> <b className="text-rose-800 dark:text-rose-100">{post.removalReason || "-"}</b></p>
        </div>
      </div>
    );
  }

  function renderModerationActions() {
    if (!detail) return null;
    const { post } = detail;
    return (
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
        <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Moderation</p>
        {post.status === "removed" ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setConfirmReason(""); setConfirmArmed(false); setConfirmError(""); setConfirm({ post, mode: "restore" }); setDetail(null); }}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-400/20 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
            >
              <RotateCcw size={16} /> Restore content
            </button>
            <p className="text-xs font-semibold text-slate-500">Restoring makes the content visible in all public feeds again and sends the creator a confirmation email.</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setConfirmReason(""); setConfirmArmed(false); setConfirmError(""); setConfirm({ post, mode: "hide" }); setDetail(null); }}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-300 dark:hover:bg-rose-400/10"
            >
              <Trash2 size={16} /> Remove content
            </button>
            <p className="text-xs font-semibold text-slate-500">Removing hides the content from all public feeds, resolves all open reports, and emails the creator.</p>
          </div>
        )}
      </div>
    );
  }

  function renderReportsTab() {
    if (!detail) return null;
    if (detail.reports.length === 0) {
      return (
        <div className="rounded-2xl border border-slate-200 p-8 text-center dark:border-white/10">
          <Flag className="mx-auto text-slate-400" />
          <h4 className="mt-3 font-black">No reports on this content</h4>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reports submitted by users will appear here for review.</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {detail.reports.map((report) => {
          const actionable = report.status === "PENDING" || report.status === "REVIEWING";
          return (
            <div key={report.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">{report.reason}</span>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${reportStatusClass(report.status)}`}>{report.status}</span>
                {report.actionTaken ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black capitalize text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">{report.actionTaken}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <p className="min-w-0"><span className="font-semibold">Reported by</span> <b className="text-slate-800 dark:text-white">{report.reporter.name}</b> <span className="break-all">({report.reporter.email})</span></p>
                <p><span className="font-semibold">Submitted</span> <b>{formatDate(report.createdAt)}</b></p>
              </div>
              {report.description ? (
                <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed dark:border-white/10 dark:bg-white/5">{report.description}</p>
              ) : null}
              {report.reviewNote ? (
                <p className="mt-2 text-xs text-slate-500"><span className="font-semibold">Decision note:</span> {report.reviewNote}</p>
              ) : null}

              {reportTarget?.id === report.id ? (
                <div className="mt-3 space-y-3 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-3 dark:border-cyan-400/20 dark:bg-cyan-400/10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black capitalize">Apply: {reportAction}</p>
                    <button onClick={closeReportAction} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Cancel</button>
                  </div>
                  <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs leading-relaxed text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">{ACTION_HINT[reportAction]}</p>
                  <textarea
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    rows={3}
                    placeholder="Reason for this decision (required) — saved to the audit log and shown to the user."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/10"
                  />
                  {DESTRUCTIVE_ACTIONS.includes(reportAction) ? (
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                      <input type="checkbox" checked={reportArmed} onChange={(event) => setReportArmed(event.target.checked)} className="mt-0.5" />
                      I understand this is a destructive action that cannot be undone.
                    </label>
                  ) : null}
                  {reportError ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{reportError}</p>
                  ) : null}
                  <div className="flex justify-end">
                    <button
                      onClick={submitReportAction}
                      disabled={reportSubmitting}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black text-white disabled:opacity-60 ${
                        DESTRUCTIVE_ACTIONS.includes(reportAction) ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-950 hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                      }`}
                    >
                      {reportSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                      {reportSubmitting ? "Applying..." : `Confirm ${reportAction}`}
                    </button>
                  </div>
                </div>
              ) : actionable ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {REPORT_ACTIONS.map((actionName) => (
                    <button
                      key={actionName}
                      onClick={() => openReportAction(report, actionName)}
                      className={`rounded-xl px-2.5 py-1.5 text-[11px] font-black capitalize transition ${
                        actionName === "remove" || actionName === "restrict" || actionName === "ban"
                          ? "border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-300 dark:hover:bg-rose-400/10"
                          : actionName === "warn" || actionName === "review"
                            ? "border border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-300 dark:hover:bg-amber-400/10"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                      }`}
                    >
                      {actionName}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs font-semibold text-slate-400">This report has been {report.status.toLowerCase()} and no longer needs action.</p>
              )}
            </div>
          );
        })}
        <p className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/10">
          <Mail size={14} className="mt-0.5 shrink-0" />
          Taking a moderation action (remove / warn / restrict / ban) sends a professional email to the affected user. Reporter details are never shared with the reported user.
        </p>
      </div>
    );
  }

  function renderConfirm() {
    if (!confirm) return null;
    const destructive = confirm.mode === "hide";
    return (
      <div className="fixed inset-0 z-[55] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              {destructive ? <AlertTriangle className="text-rose-500" size={22} /> : <RotateCcw className="text-emerald-500" size={22} />}
              <div>
                <h3 className="text-lg font-black">{destructive ? "Remove content" : "Restore content"}</h3>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">{confirm.post.id}</p>
              </div>
            </div>
            <button onClick={() => setConfirm(null)} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/10">
            <p className="font-semibold">{confirm.post.content || "(no caption)"}</p>
            <p className="mt-1 text-xs text-slate-500">{confirm.post.isVideo ? "Video" : "Post"} · {confirm.post.creator?.name || "Unknown"}</p>
          </div>

          {destructive ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
              This hides the content from all public feeds and profiles, resolves all open reports, and emails the creator. You can restore it later from this panel.
            </p>
          ) : (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              Restoring makes this content visible in all public feeds again and emails the creator.
            </p>
          )}

          <textarea
            value={confirmReason}
            onChange={(event) => setConfirmReason(event.target.value)}
            rows={3}
            placeholder={destructive ? "Removal reason (required) — saved to the audit log and sent to the creator." : "Optional note (sent to the creator as the moderation note)."}
            className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/10"
          />

          {destructive ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
              <input type="checkbox" checked={confirmArmed} onChange={(event) => setConfirmArmed(event.target.checked)} className="mt-0.5" />
              I understand this removes the content from OrbitByte.
            </label>
          ) : null}

          {confirmError ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{confirmError}</p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">
              Cancel
            </button>
            <button
              onClick={submitPostAction}
              disabled={confirmSubmitting}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black text-white disabled:opacity-60 ${
                destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {confirmSubmitting ? <Loader2 className="animate-spin" size={16} /> : destructive ? <Trash2 size={16} /> : <RotateCcw size={16} />}
              {confirmSubmitting ? "Applying..." : destructive ? "Remove content" : "Restore content"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}