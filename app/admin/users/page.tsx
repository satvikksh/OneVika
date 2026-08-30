"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  Crown,
  Film,
  Flag,
  History,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { AdminEmptyState } from "../components/AdminEmptyState";

type AccountStatus = "active" | "warned" | "restricted" | "suspended" | "banned";

type StatusFilter =
  | "all"
  | "active"
  | "suspended"
  | "banned"
  | "verified"
  | "unverified"
  | "premium"
  | "regular";

type ListUser = {
  id: string;
  name: string;
  email: string;
  handle: string;
  avatar: string;
  provider: string;
  role: "USER" | "ADMIN";
  accountStatus: AccountStatus;
  accountStatusReason: string;
  accountStatusAt: string | null;
  verified: boolean;
  verifiedAt: string | null;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  counts: {
    total: number;
    active: number;
    removed: number;
    videos: number;
    followers: number;
    following: number;
  };
  createdAt: string | null;
  updatedAt: string | null;
  lastSeen: string | null;
};

type Summary = {
  total: number;
  active: number;
  warned: number;
  restricted: number;
  suspended: number;
  banned: number;
  verified: number;
  unverified: number;
  premium: number;
  regular: number;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

type GroupSummary = Record<string, { count: number; amountPaise: number }>;

type UserDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    handle: string;
    nickname: string;
    bio: string;
    isPrivate: boolean;
    avatar: string;
    provider: string;
    role: "USER" | "ADMIN";
    accountStatus: AccountStatus;
    accountStatusReason: string;
    accountStatusAt: string | null;
    verified: boolean;
    verifiedAt: string | null;
    isPremium: boolean;
    premiumExpiresAt: string | null;
    premiumActivatedAt: string | null;
    premiumPlan: string | null;
    premiumPaymentProvider: string | null;
    premiumLastPaymentAt: string | null;
    followers: number;
    following: number;
    createdAt: string | null;
    updatedAt: string | null;
    lastSeen: string | null;
  };
  content: {
    postsTotal: number;
    postsActive: number;
    postsRemoved: number;
    videos: number;
    totalLikes: number;
    recentPosts: Array<{
      id: string;
      content: string;
      status: string;
      isVideo: boolean;
      images: string[];
      createdAt: string;
    }>;
  };
  finance: {
    wallet: {
      availablePaise: number;
      totalEarnedPaise: number;
      totalWithdrawnPaise: number;
    } | null;
    earningTransactions: { summary: GroupSummary; recent: Array<{ id: string; type: string; amountPaise: number; status: string; description: string; createdAt: string }> };
    withdrawals: { summary: GroupSummary; recent: Array<{ id: string; amountPaise: number; status: string; payoutMethod: string; adminNote: string; createdAt: string; completedAt: string | null }> };
    creatorEarningTransactions: { summary: GroupSummary };
    creatorAllocations: { summary: GroupSummary };
    fraudReviews: Array<{ id: string; riskScore: number; status: string; createdAt: string }>;
  };
  reports: {
    total: number;
    items: Array<{ id: string; reason: string; description: string; status: string; actionTaken: string | null; contentType: string; createdAt: string }>;
  };
  moderationHistory: Array<{ id: string; adminId: string; action: string; description: string; createdAt: string }>;
  deletable: boolean;
  deleteBlocks: string[];
};

type ActionKind =
  | "verify"
  | "unverify"
  | "suspend"
  | "unsuspend"
  | "ban"
  | "unban"
  | "delete";

const EMPTY_SUMMARY: Summary = {
  total: 0,
  active: 0,
  warned: 0,
  restricted: 0,
  suspended: 0,
  banned: 0,
  verified: 0,
  unverified: 0,
  premium: 0,
  regular: 0,
};

const STATUS_BADGE: Record<AccountStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  warned: { label: "Warned", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  restricted: { label: "Restricted", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  suspended: { label: "Suspended", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  banned: { label: "Banned", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

const FILTER_PILLS: Array<{ key: StatusFilter; label: string; countKey?: keyof Summary }> = [
  { key: "all", label: "All", countKey: "total" },
  { key: "active", label: "Active", countKey: "active" },
  { key: "suspended", label: "Suspended", countKey: "suspended" },
  { key: "banned", label: "Banned", countKey: "banned" },
  { key: "verified", label: "Verified", countKey: "verified" },
  { key: "premium", label: "Premium", countKey: "premium" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest first" },
  { value: "createdAtAsc", label: "Oldest first" },
  { value: "updatedAt", label: "Recently active" },
  { value: "name", label: "Name A–Z" },
  { value: "followers", label: "Most followers" },
];

const ACTION_LABELS: Record<ActionKind, { title: string; body: string; requiresReason: boolean }> = {
  verify: { title: "Verify this account?", body: "This will mark the account as verified across OrbitByte. A confirmation email will be sent.", requiresReason: false },
  unverify: { title: "Remove verification?", body: "This will remove the account's verified status. A confirmation email will be sent.", requiresReason: false },
  suspend: { title: "Suspend this account?", body: "A suspended account is locked — the user loses access to all OrbitByte features and sees only an Account Suspended screen. Their data, posts, and earnings are preserved, and access is restored automatically when the suspension is lifted. A confirmation email with review instructions (satvikksh@gmail.com) is sent to the user.", requiresReason: true },
  unsuspend: { title: "Remove the suspension?", body: "This restores full access to the account automatically. All data, posts, followers, and earnings remain intact, and the user can sign in normally again. A confirmation email will be sent.", requiresReason: false },
  ban: { title: "Ban this account permanently?", body: "A banned account can no longer sign in or use OrbitByte. A confirmation email will be sent to the user.", requiresReason: true },
  unban: { title: "Unban this account?", body: "This will restore access to the account and clear the ban. A confirmation email will be sent.", requiresReason: false },
  delete: { title: "Delete this account permanently?", body: "The account and its personal data will be permanently deleted. Public content and any compliance records will be retained. This cannot be undone.", requiresReason: true },
};

function fmtPaise(paise: number) {
  const value = Number.isFinite(paise) ? paise / 100 : 0;
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDay(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Avatar({ src, name, size = "md" }: { src: string; name: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-20 w-20 text-xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  return src ? (
    <img
      src={src}
      alt={name}
      className={`${cls} shrink-0 rounded-full object-cover ring-1 ring-white/20`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  ) : (
    <div
      className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 font-bold text-white`}
    >
      {String(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function StatBadge({ label, cls, title }: { label: string; cls: string; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

export default function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState("createdAt");
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState<ListUser[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailTab, setDetailTab] = useState<"overview" | "content" | "reports" | "history" | "finance">("overview");

  // profile edit form
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPrivate, setEditPrivate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // confirm modal
  const [confirm, setConfirm] = useState<ActionKind | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const [toast, setToast] = useState<{ tone: "success" | "warn"; text: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ page: String(page), status: filter, sort, limit: "20" });
      if (search) qs.set("q", search);
      const res = await fetch(`/api/admin/users?${qs}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load users");
      setUsers(payload.users || []);
      setSummary(payload.summary || EMPTY_SUMMARY);
      if (payload.pagination) setPagination(payload.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, [page, filter, sort, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filter, sort, search]);

  const loadDetail = useCallback(async (userId: string) => {
    setLoadingDetail(true);
    setDetailError("");
    setDetailTab("overview");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load user detail");
      setDetail(payload);
      const u = payload.user;
      if (u) {
        setEditName(u.name ?? "");
        setEditNickname(u.nickname ?? "");
        setEditBio(u.bio ?? "");
        setEditPrivate(Boolean(u.isPrivate));
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Unable to load user detail");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  function openConfirm(action: ActionKind) {
    setConfirm(action);
    setConfirmReason("");
    setConfirmArmed(false);
    setConfirmError("");
  }

  function closeConfirm() {
    if (confirmSubmitting) return;
    setConfirm(null);
    setConfirmReason("");
    setConfirmArmed(false);
    setConfirmError("");
  }

  async function submitConfirm() {
    if (!confirm || !detail) return;
    const trimmed = confirmReason.trim();
    const meta = ACTION_LABELS[confirm];
    if (meta.requiresReason && !trimmed) {
      setConfirmError("A reason is required.");
      return;
    }
    if (confirm === "delete" && !confirmArmed) {
      setConfirmError("Confirm the checkbox to delete this account.");
      return;
    }
    setConfirmSubmitting(true);
    setConfirmError("");
    try {
      const url = `/api/admin/users/${detail.user.id}`;
      let res: Response;
      if (confirm === "delete") {
        res = await fetch(url, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: trimmed }),
        });
      } else {
        res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: confirm, reason: trimmed }),
        });
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to perform action");

      const email = payload.email;
      if (confirm === "delete") {
        setDetail(null);
        setToast({ tone: "success", text: `Account ${detail.user.email} deleted.${email && !email.delivered ? ` Email notice failed (${email.error || "delivery failed"}).` : " Deletion notice sent by email."}` });
      } else if (email && !email.delivered) {
        setToast({ tone: "warn", text: `${ACTION_LABELS[confirm].title} — action applied but the notification email could not be sent (${email.error || "delivery failed"}).` });
      } else {
        setToast({ tone: "success", text: `${ACTION_LABELS[confirm].title} — done.${email ? " Notification email sent." : ""}` });
      }
      setConfirm(null);
      setConfirmReason("");
      setConfirmArmed(false);
      if (confirm !== "delete") await loadDetail(detail.user.id);
      await load();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Unable to perform action");
    } finally {
      setConfirmSubmitting(false);
    }
  }

  async function saveProfileEdit() {
    if (!detail) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/users/${detail.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          update: {
            name: editName.trim(),
            nickname: editNickname.trim(),
            bio: editBio,
            isPrivate: editPrivate,
          },
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to update profile");
      setToast({ tone: "success", text: "Profile updated." });
      await loadDetail(detail.user.id);
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unable to update profile");
    } finally {
      setSavingEdit(false);
    }
  }

  const activeFilterLabel = useMemo(() => {
    const match = FILTER_PILLS.find((p) => p.key === filter);
    return match ? match.label.toLowerCase() : "all";
  }, [filter]);

  const confirmMeta = confirm ? ACTION_LABELS[confirm] : null;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Identity management</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Users</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Manage registered accounts: verify identities, suspend or ban accounts, edit profile details, and review a
          member&apos;s activity, reports, moderation history, and earnings.
        </p>
      </section>

      {toast ? (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            toast.tone === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
          }`}
        >
          {toast.text}
          <button
            onClick={() => setToast(null)}
            className="ml-auto rounded-full p-1 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white/75 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <Search size={17} className="shrink-0 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearchInput("")} className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_PILLS.map((pill) => {
            const active = filter === pill.key;
            const count = pill.countKey ? summary[pill.countKey] : undefined;
            return (
              <button
                key={pill.key}
                onClick={() => setFilter(pill.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-sky-500 text-white shadow-sm"
                    : "border border-slate-200 bg-white/75 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:border-white/20"
                }`}
              >
                {pill.label}
                {count !== undefined ? (
                  <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/25" : "bg-slate-500/10 dark:bg-white/10"}`}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="ml-auto h-9 rounded-xl border border-slate-200 bg-white/75 px-2 text-xs font-semibold text-slate-600 outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* content */}
      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-6 py-10 text-center">
          <ShieldAlert size={28} className="text-rose-400" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/20"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
                <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <AdminEmptyState
          icon={Users}
          title={filter === "all" && !search ? "No users yet" : `No ${activeFilterLabel} users found`}
          description={
            filter === "all" && !search
              ? "Users appear here once they create an account."
              : "Try a different filter or search term."
          }
        />
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur-xl md:block dark:border-white/10 dark:bg-white/[0.04]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:text-slate-500">
                  <th className="px-4 py-3 font-bold">Member</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Membership</th>
                  <th className="px-4 py-3 font-bold">Content</th>
                  <th className="px-4 py-3 font-bold">Followers / Following</th>
                  <th className="px-4 py-3 font-bold">Joined</th>
                  <th className="px-4 py-3 font-bold">Last active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const badge = STATUS_BADGE[u.accountStatus];
                  return (
                    <tr
                      key={u.id}
                      onClick={() => void loadDetail(u.id)}
                      className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-sky-500/[0.06] dark:border-white/5 dark:hover:bg-white/[0.04]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatar} name={u.name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate font-bold text-slate-800 dark:text-slate-100">{u.name}</p>
                              {u.role === "ADMIN" && (
                                <Shield size={13} className="shrink-0 text-indigo-400" />
                              )}
                            </div>
                            <p className="truncate text-xs text-slate-400">@{u.handle}</p>
                            <p className="truncate text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <StatBadge label={badge.label} cls={badge.cls} />
                          {u.verified && (
                            <StatBadge label="✓ Verified" cls="bg-sky-500/15 text-sky-600 dark:text-sky-400" title={fmtDate(u.verifiedAt)} />
                          )}
                        </div>
                        {u.accountStatus !== "active" && u.accountStatusReason ? (
                          <p className="mt-1 max-w-[200px] truncate text-[11px] text-slate-400" title={u.accountStatusReason}>
                            {u.accountStatusReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {u.isPremium ? (
                          <StatBadge label="Premium" cls="bg-violet-500/15 text-violet-600 dark:text-violet-400" title={u.premiumExpiresAt ? `Until ${fmtDay(u.premiumExpiresAt)}` : undefined} />
                        ) : (
                          <span className="text-xs text-slate-400">Regular</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {u.counts.total} posts · {u.counts.videos} videos
                        </p>
                        {u.counts.removed > 0 && (
                          <p className="text-[11px] text-rose-400">{u.counts.removed} removed</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {u.counts.followers} / {u.counts.following}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{fmtDay(u.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{fmtDay(u.lastSeen || u.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight size={16} className="ml-auto text-slate-300 dark:text-slate-600" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="space-y-3 md:hidden">
            {users.map((u) => {
              const badge = STATUS_BADGE[u.accountStatus];
              return (
                <button
                  key={u.id}
                  onClick={() => void loadDetail(u.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/75 p-4 text-left shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={u.avatar} name={u.name} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-bold text-slate-800 dark:text-slate-100">
                        {u.name}
                        {u.role === "ADMIN" && <Shield size={13} className="shrink-0 text-indigo-400" />}
                      </p>
                      <p className="truncate text-xs text-slate-400">@{u.handle} · {u.email}</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-300 dark:text-slate-500" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <StatBadge label={badge.label} cls={badge.cls} />
                    {u.verified && <StatBadge label="✓ Verified" cls="bg-sky-500/15 text-sky-600 dark:text-sky-400" />}
                    {u.isPremium && <StatBadge label="Premium" cls="bg-violet-500/15 text-violet-600 dark:text-violet-400" />}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{u.counts.total}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Posts</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{u.counts.videos}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Videos</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {u.counts.followers}
                        <span className="text-slate-400"> / {u.counts.following}</span>
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Followers</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Joined {fmtDay(u.createdAt)}</span>
                    <span>Active {fmtDay(u.lastSeen || u.updatedAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* pagination */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {pagination.total} user{pagination.total === 1 ? "" : "s"} · page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white/75 px-3 text-xs font-bold text-slate-600 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white/75 px-3 text-xs font-bold text-slate-600 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* detail drawer */}
      {detail ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-white/10 dark:bg-[#0b1526]">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1728]/90">
              <button
                onClick={() => setDetail(null)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/75 px-3 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{detail.user.name}</p>
                <p className="truncate text-xs text-slate-400">{detail.user.email}</p>
              </div>
              <button
                onClick={() => void loadDetail(detail.user.id)}
                className="rounded-xl border border-slate-200 bg-white/75 p-2 text-slate-500 hover:text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:hover:text-slate-200"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
              {(
                [
                  ["overview", "Overview"],
                  ["content", `Content${detail.content.postsTotal ? ` (${detail.content.postsTotal})` : ""}`],
                  ["reports", `Reports${detail.reports.total ? ` (${detail.reports.total})` : ""}`],
                  ["history", "History"],
                  ["finance", "Finance"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDetailTab(key)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    detailTab === key
                      ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {detailError ? (
              <div className="m-5 flex flex-col items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-6 py-10 text-center">
                <ShieldAlert size={24} className="text-rose-400" />
                <p className="text-sm font-semibold text-rose-500">{detailError}</p>
                <button
                  onClick={() => void loadDetail(detail.user.id)}
                  className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/20"
                >
                  Retry
                </button>
              </div>
            ) : loadingDetail ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-200/70 dark:bg-white/10" />
                ))}
              </div>
            ) : detailTab === "overview" ? (
              <div className="space-y-5 p-5">
                {/* identity header */}
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                  <Avatar src={detail.user.avatar} name={detail.user.name} size="lg" />
                  <div>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100">{detail.user.name}</p>
                    <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">Username</p>
                    <p className="text-sm font-semibold text-slate-400">@{detail.user.handle}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{detail.user.email}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <StatBadge label={(STATUS_BADGE[detail.user.accountStatus] ?? STATUS_BADGE.active).label} cls={(STATUS_BADGE[detail.user.accountStatus] ?? STATUS_BADGE.active).cls} />
                    {detail.user.verified && <StatBadge label="✓ Verified" cls="bg-sky-500/15 text-sky-600 dark:text-sky-400" />}
                    {detail.user.isPremium && <StatBadge label="Premium" cls="bg-violet-500/15 text-violet-600 dark:text-violet-400" title={detail.user.premiumExpiresAt ? `Until ${fmtDay(detail.user.premiumExpiresAt)}` : undefined} />}
                    {detail.user.role === "ADMIN" && <StatBadge label="Admin" cls="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  {detail.user.accountStatus !== "active" && (
                    <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
                      Reason: <span className="font-semibold">{detail.user.accountStatusReason || "—"}</span> · {fmtDate(detail.user.accountStatusAt)}
                    </p>
                  )}
                  <div className="grid w-full grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
                      <p className="font-black text-slate-700 dark:text-slate-200">{detail.content.postsTotal}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Posts</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
                      <p className="font-black text-slate-700 dark:text-slate-200">{detail.content.videos}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Videos / Reels</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
                      <p className="font-black text-slate-700 dark:text-slate-200">{detail.user.followers}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Followers</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
                      <p className="font-black text-slate-700 dark:text-slate-200">{detail.user.following}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Following</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                      <BadgeCheck size={16} className="text-sky-400" /> Account details
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span>Joined {fmtDate(detail.user.createdAt)}</span>
                      <span>Last active {fmtDate(detail.user.lastSeen || detail.user.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Name</span>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-950/40"
                      />
                    </label>
                    <div className="block">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Username</span>
                      <p className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pt-2.5 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
                        @{detail.user.handle}
                      </p>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Display name</span>
                      <input
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        placeholder="Nickname"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-950/40"
                      />
                    </label>
                    <div className="block">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Email</span>
                      <p className="h-10 w-full truncate rounded-xl border border-slate-200 bg-slate-50 px-3 pt-2.5 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
                        {detail.user.email}
                      </p>
                    </div>
                  </div>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Bio</span>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-950/40"
                    />
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={editPrivate}
                      onChange={(e) => setEditPrivate(e.target.checked)}
                      className="h-4 w-4 rounded accent-sky-500"
                    />
                    Private account
                  </label>
                  {editError ? <p className="mt-2 text-xs font-semibold text-rose-500">{editError}</p> : null}
                  <button
                    onClick={() => void saveProfileEdit()}
                    disabled={savingEdit}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-black text-white shadow-sm hover:bg-sky-600 disabled:opacity-50"
                  >
                    {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    Save profile
                  </button>
                </div>

                {/* moderation actions */}
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                  <h3 className="mb-1 inline-flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                    <ShieldAlert size={16} className="text-amber-400" /> Moderation actions
                  </h3>
                  <p className="mb-4 text-xs text-slate-400">
                    Actions are recorded in the audit log and email the member. Suspensions and bans require a reason.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {detail.user.verified ? (
                      <ActionButton tone="neutral" onClick={() => openConfirm("unverify")} icon={<BadgeCheck size={14} />} label="Unverify account" />
                    ) : (
                      <ActionButton tone="sky" onClick={() => openConfirm("verify")} icon={<BadgeCheck size={14} />} label="Verify account" />
                    )}
                    {detail.user.accountStatus === "active" || detail.user.accountStatus === "warned" ? (
                      <ActionButton tone="amber" onClick={() => openConfirm("suspend")} icon={<ShieldAlert size={14} />} label="Suspend account" />
                    ) : null}
                    {detail.user.accountStatus === "restricted" || detail.user.accountStatus === "suspended" ? (
                      <ActionButton tone="emerald" onClick={() => openConfirm("unsuspend")} icon={<Shield size={14} />} label="Lift suspension" />
                    ) : null}
                    {detail.user.accountStatus === "active" || detail.user.accountStatus === "warned" || detail.user.accountStatus === "restricted" || detail.user.accountStatus === "suspended" ? (
                      <ActionButton tone="rose" onClick={() => openConfirm("ban")} icon={<Ban size={14} />} label="Ban account" />
                    ) : null}
                    {detail.user.accountStatus === "banned" ? (
                      <ActionButton tone="emerald" onClick={() => openConfirm("unban")} icon={<Shield size={14} />} label="Unban account" />
                    ) : null}
                  </div>

                  {/* danger zone */}
                  <div className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
                    <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-rose-500">
                      <Trash2 size={13} /> Danger zone
                    </p>
                    {detail.deletable ? (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                        Permanently delete this account and its personal data. Posts, reports, and audit records are kept.
                      </p>
                    ) : (
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                        This account cannot be deleted because it has records that must be preserved. Suspend or ban
                        instead.
                      </p>
                    )}
                    <button
                      onClick={() => openConfirm("delete")}
                      disabled={!detail.deletable}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-black text-rose-500 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={14} /> Delete account
                    </button>
                  </div>
                </div>
              </div>
            ) : detailTab === "content" ? (
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Posts", detail.content.postsTotal],
                    ["Videos", detail.content.videos],
                    ["Likes", detail.content.totalLikes],
                    ["Removed", detail.content.postsRemoved],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-slate-200 bg-white/70 px-2 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="text-lg font-black text-slate-700 dark:text-slate-200">{value}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
                {detail.content.recentPosts.length === 0 ? (
                  <AdminEmptyState icon={Film} title="No posts" description="This member has not posted anything." />
                ) : (
                  <div className="space-y-2">
                    {detail.content.recentPosts.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/[0.06]">
                          {p.images[0] && !p.isVideo ? (
                            <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : p.isVideo ? (
                            <Film size={18} className="text-sky-400" />
                          ) : (
                            <ImageIcon size={18} className="text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-slate-700 dark:text-slate-300">{p.content || "Untitled post"}</p>
                          <p className="text-[11px] text-slate-400">{fmtDate(p.createdAt)}</p>
                        </div>
                        <StatBadge
                          label={p.status === "removed" ? "Removed" : p.isVideo ? "Video" : "Post"}
                          cls={p.status === "removed" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : detailTab === "reports" ? (
              <div className="space-y-3 p-5">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {detail.reports.total} report{detail.reports.total === 1 ? "" : "s"} against this member
                </p>
                {detail.reports.items.length === 0 ? (
                  <AdminEmptyState icon={Flag} title="No reports" description="No community reports reference this member." />
                ) : (
                  detail.reports.items.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{r.reason}</p>
                        <StatBadge
                          label={r.status}
                          cls="bg-slate-500/10 text-slate-500 dark:text-slate-400"
                        />
                        {r.actionTaken ? (
                          <StatBadge label={r.actionTaken} cls="bg-amber-500/15 text-amber-600 dark:text-amber-400" />
                        ) : null}
                        <span className="ml-auto text-[11px] uppercase tracking-wide text-slate-400">{r.contentType} · {fmtDate(r.createdAt)}</span>
                      </div>
                      {r.description ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{r.description}</p> : null}
                    </div>
                  ))
                )}
              </div>
            ) : detailTab === "history" ? (
              <div className="space-y-3 p-5">
                {detail.moderationHistory.length === 0 ? (
                  <AdminEmptyState icon={History} title="No moderation history" description="No admin actions have ever been recorded for this member." />
                ) : (
                  detail.moderationHistory.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-500/10">
                        <History size={14} className="text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{h.action}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{h.description}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {fmtDate(h.createdAt)} · by admin {String(h.adminId).slice(-6)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <FinanceTab finance={detail.finance} />
            )}
          </div>
        </div>
      ) : null}

      {/* confirm modal */}
      {confirm && confirmMeta ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0d1728]">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{confirmMeta.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{confirmMeta.body}</p>

            {confirmMeta.requiresReason ? (
              <label className="mt-4 block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Reason {confirm === "delete" ? "(required)" : "(required)"}
                </span>
                <textarea
                  value={confirmReason}
                  onChange={(e) => setConfirmReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this action is being taken…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-950/40"
                />
              </label>
            ) : null}

            {confirm === "delete" ? (
              <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={confirmArmed}
                  onChange={(e) => setConfirmArmed(e.target.checked)}
                  className="h-4 w-4 rounded accent-rose-500"
                />
                I understand this permanently deletes the account.
              </label>
            ) : null}

            {confirmError ? <p className="mt-3 text-xs font-semibold text-rose-500">{confirmError}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeConfirm}
                disabled={confirmSubmitting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitConfirm()}
                disabled={confirmSubmitting}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white shadow-sm disabled:opacity-50 ${
                  confirm === "ban" || confirm === "delete"
                    ? "bg-rose-500 hover:bg-rose-600"
                    : confirm === "suspend"
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-sky-500 hover:bg-sky-600"
                }`}
              >
                {confirmSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                {confirm === "delete" ? "Delete account" : confirm ? `${confirm.charAt(0).toUpperCase()}${confirm.slice(1)}` : ""}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  icon,
  tone,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  tone: "sky" | "amber" | "rose" | "emerald" | "neutral";
}) {
  const tones: Record<string, string> = {
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 dark:text-sky-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
    neutral: "border-slate-300 bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 dark:border-white/15 dark:text-slate-300",
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${tones[tone]}`}
    >
      {icon} {label}
    </button>
  );
}

function FinanceTab({ finance }: { finance: UserDetail["finance"] }) {
  const empty = (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <Wallet size={14} /> No activity yet
      </p>
    </div>
  );

  return (
    <div className="space-y-5 p-5">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
        <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          <Wallet size={16} className="text-emerald-400" /> Wallet balance
        </h3>
        {finance.wallet ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-2 py-3 dark:bg-white/[0.04]">
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fmtPaise(finance.wallet.availablePaise)}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Available</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-3 dark:bg-white/[0.04]">
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{fmtPaise(finance.wallet.totalEarnedPaise)}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Earned</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-3 dark:bg-white/[0.04]">
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{fmtPaise(finance.wallet.totalWithdrawnPaise)}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Withdrawn</p>
            </div>
          </div>
        ) : (
          empty
        )}
      </div>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          <Crown size={16} className="text-amber-400" /> Earning transactions
        </h3>
        <SummaryRows summary={finance.earningTransactions.summary} />
        {finance.earningTransactions.recent.length > 0 && (
          <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white/70 dark:divide-white/5 dark:border-white/10 dark:bg-white/[0.04]">
            {finance.earningTransactions.recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    {t.type}
                    <span className="ml-2 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{t.status}</span>
                  </p>
                  {t.description ? <p className="truncate text-xs text-slate-400">{t.description}</p> : null}
                  <p className="text-[11px] text-slate-400">{fmtDate(t.createdAt)}</p>
                </div>
                <p className={`font-black ${t.type === "EARNING" ? "text-emerald-600" : "text-slate-700 dark:text-slate-300"}`}>{fmtPaise(t.amountPaise)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          <Wallet size={16} className="text-sky-400" /> Withdrawals
        </h3>
        <SummaryRows summary={finance.withdrawals.summary} />
        {finance.withdrawals.recent.length > 0 && (
          <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white/70 dark:divide-white/5 dark:border-white/10 dark:bg-white/[0.04]">
            {finance.withdrawals.recent.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    {w.status}
                    <span className="ml-2 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{w.payoutMethod}</span>
                  </p>
                  {w.adminNote ? <p className="text-xs text-slate-400">{w.adminNote}</p> : null}
                  <p className="text-[11px] text-slate-400">{fmtDate(w.createdAt)}</p>
                </div>
                <p className="font-black text-slate-700 dark:text-slate-300">{fmtPaise(w.amountPaise)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          <Crown size={16} className="text-violet-400" /> Creator revenue
        </h3>
        {Object.keys(finance.creatorAllocations.summary).length > 0 ? (
          <SummaryRows summary={finance.creatorAllocations.summary} />
        ) : (
          <p className="text-xs text-slate-400">No creator revenue allocations yet.</p>
        )}
        {Object.keys(finance.creatorEarningTransactions.summary).length > 0 ? (
          <div className="mt-3">
            <SummaryRows summary={finance.creatorEarningTransactions.summary} />
          </div>
        ) : null}
        {finance.fraudReviews.length > 0 ? (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-500">Fraud reviews</p>
            {finance.fraudReviews.map((f) => (
              <p key={f.id} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {f.status} · risk {f.riskScore} · {fmtDate(f.createdAt)}
              </p>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SummaryRows({ summary }: { summary: GroupSummary }) {
  const entries = Object.entries(summary);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, row]) => (
        <div key={key} className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{key}</p>
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">{fmtPaise(row.amountPaise)}</p>
          <p className="text-[10px] text-slate-400">{row.count} tx</p>
        </div>
      ))}
    </div>
  );
}