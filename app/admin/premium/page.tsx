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
  FolderKanban,
  Heart,
  Landmark,
  MessageSquare,
  RefreshCw,
  Scale,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Users2,
  Wallet,
  Zap,
} from "lucide-react";

import { useTheme } from "@/app/theme-provider";
import { usePathname, useSearchParams } from "next/navigation";
import { useState as useReactState } from "react";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function fmt(value?: number | null) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function inr(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

function dateToString(d: Date | null | undefined) {
  if (!d || !isValidDate(d)) return "—";
  return d.toISOString().split("T")[0];
}

const ToneClasses: Record<string, string> = {
  emerald: "from-emerald-400 to-blue-500",
  rose: "from-rose-500 to-red-500",
  amber: "from-amber-500 to-orange-500",
  slate: "from-slate-500 to-indigo-500",
  violet: "from-violet-500 to-pink-500",
  cyan: "from-cyan-500 to-teal-500",
};

function getToneClass(tone: string) {
  for (const [key, cls] of Object.entries(ToneClasses)) {
    if (tone.includes(key)) return cls;
  }
  return "from-slate-500 to-blue-500";
}

function renderStatsCards(stats: any) {
  const {
    totalMembers,
    activeMemberships,
    expiredMemberships,
    cancelledMemberships,
    newPurchasesLast30Days,
    premiumRevenueLast30Days,
    pendingPayments,
    failedPayments,
    refundsLast30Days,
    pendingAmount,
  } = stats;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]" + getToneClass("from-emerald-400 to-blue-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-emerald-400 to-blue-500 text-white shadow-lg">
            <UserPlus size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Total Premium Members</p>
            <p className="text-3xl font-black">{fmt(totalMembers)}</p>
          </div>
        </div>
      </div>

      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.6]" + getToneClass("from-emerald-400 to-teal-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-emerald-400 to-teal-500 text-white shadow-lg">
            <BadgeCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Active Memberships</p>
            <p className="text-3xl font-black">{fmt(activeMemberships)}</p>
          </div>
        </div>
      </div>

      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]" + getToneClass("from-rose-500 to-red-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-rose-500 to-red-500 text-white shadow-lg">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Expired Memberships</p>
            <p className="text-3xl font-black">{fmt(expiredMemberships)}</p>
          </div>
        </div>
      </div>

      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]" + getToneClass("from-amber-500 to-orange-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-amber-500 to-orange-500 text-white shadow-lg">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Cancelled</p>
            <p className="text-3xl font-black">{fmt(cancelledMemberships)}</p>
          </div>
        </div>
      </div>

      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]" + getToneClass("from-slate-500 to-indigo-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-slate-500 to-indigo-500 text-white shadow-lg">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">New Purchases (30d)</p>
            <p className="text-3xl font-black">{fmt(newPurchasesLast30Days)}</p>
          </div>
        </div>
      </div>

      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]" + getToneClass("from-violet-500 to-pink-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-violet-500 to-pink-500 text-white shadow-lg">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Premium Revenue (30d)</p>
            <p className="text-3xl font-black">{inr(premiumRevenueLast30Days)}</p>
          </div>
        </div>
      </div>

      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]" + getToneClass("from-amber-500 to-red-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-amber-500 to-red-500 text-white shadow-lg">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Pending Payments</p>
            <p className="text-3xl font-black">{fmt(pendingPayments)}</p>
          </div>
        </div>
      </div>

      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]" + getToneClass("from-rose-500 to-red-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-rose-500 to-red-500 text-white shadow-lg">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Failed Payments</p>
            <p className="text-3xl font-black">{fmt(failedPayments)}</p>
          </div>
        </div>
      </div>

      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]" + getToneClass("from-slate-500 to-cyan-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-slate-500 to-cyan-500 text-white shadow-lg">
            <MessageSquare size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Refunds (30d)</p>
            <p className="text-3xl font-black">{fmt(refundsLast30Days)}</p>
          </div>
        </div>
      </div>

      <div className={ "rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]" + getToneClass("from-cyan-500 to-teal-500") }>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl from-cyan-500 to-teal-500 text-white shadow-lg">
            <Coins size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Pending Amount</p>
            <p className="text-3xl font-black">{inr(pendingAmount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPremiumPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [page, setPage] = useReactState(1);
  const [pageSize, setPageSize] = useReactState(20);
  const [sortBy, setSortBy] = useReactState("membershipStart");
  const [sortOrder, setSortOrder] = useReactState("desc");
  const [filter, setFilter] = useReactState("all");
  const [searchQuery, setSearchQuery] = useReactState("");
  const [fromDate, setFromDate] = useReactState<string | undefined>(undefined);
  const [toDate, setToDate] = useReactState<string | undefined>(undefined);
  const [stats, setStats] = useReactState({
    totalMembers: 0,
    activeMemberships: 0,
    expiredMemberships: 0,
    cancelledMemberships: 0,
    newPurchasesLast30Days: 0,
    premiumRevenueLast30Days: 0,
    pendingPayments: 0,
    failedPayments: 0,
    refundsLast30Days: 0,
    pendingAmount: 0,
  });
  const [table, setTable] = useReactState({
    data: [] as any[],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useReactState(true);
  const [error, setError] = useReactState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        "/api/admin/premium?page=" + page + "&pageSize=" + pageSize + "&sortBy=" + sortBy + "&order=" + sortOrder + "&filter=" + filter + "&q=" + encodeURIComponent(searchQuery) + "&fromDate=" + (fromDate ?? "") + "&toDate=" + (toDate ?? ""),
        { cache: "no-store" }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load premium data");
      setStats(payload.stats);
      setTable(payload.table);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load premium data");
      console.error("ADMIN PREMIUM LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, filter, searchQuery, fromDate, toDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleSortChange = (newSort: string) => {
    if (newSort === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSort);
      setSortOrder("desc");
    }
  };

  const handleAdminAction = async (
    action: "activate" | "extend" | "cancel" | "suspend" | "restore" | "refund",
    row: any
  ) => {
    if (!row?.userId) {
      alert("User ID not found for this transaction");
      return;
    }

    let ok = false;
    let result: any;
    switch (action) {
      case "activate": {
        result = await fetch("/api/admin/premium", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            targetId: row._id,
            userId: row.userId,
            reason: "admin_manual",
          }),
        });
        ok = result.ok;
        break;
      }
      case "extend": {
        result = await fetch("/api/admin/premium", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            targetId: row._id,
            userId: row.userId,
            extendDays: 30,
            reason: "admin_manual",
          }),
        });
        ok = result.ok;
        break;
      }
      case "cancel": {
        result = await fetch("/api/admin/premium", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            targetId: row._id,
            userId: row.userId,
            reason: "admin_manual",
          }),
        });
        ok = result.ok;
        break;
      }
      case "suspend": {
        result = await fetch("/api/admin/premium", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            targetId: row._id,
            userId: row.userId,
            reason: "admin_manual",
          }),
        });
        ok = result.ok;
        break;
      }
      case "restore": {
        result = await fetch("/api/admin/premium", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            targetId: row._id,
            userId: row.userId,
            reason: "admin_manual",
          }),
        });
        ok = result.ok;
        break;
      }
      case "refund": {
        result = await fetch("/api/admin/premium", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            targetId: row._id,
            userId: row.userId,
            reason: "admin_manual",
          }),
        });
        ok = result.ok;
        break;
      }
    }

    if (ok) {
      alert(`${action} completed successfully`);
      void loadData();
    } else {
      const err = await result.json().catch(() => ({ error: "Unknown error" }));
      alert(err.error || "Action failed");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <motion.div
          className="rounded-3xl border border-slate-200 bg-white/75 p-8 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]"
        >
          <motion.span className=" animate-pulse text-3xl opacity-50" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">Loading premium membership data…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-black tracking-tight">Premium Membership Management</h2>
      {renderStatsCards(stats)}
      <div className="mt-6">Filter: {filter} | Page: {page}</div>
    </div>
  );
}
