"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Film,
  Flag,
  Landmark,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const QUICK_ACTIONS = [
  { label: "Manage Users", href: "/admin/users", icon: Users, tone: "from-cyan-400 to-blue-500" },
  { label: "Posts & Videos", href: "/admin/posts", icon: Film, tone: "from-violet-400 to-fuchsia-500" },
  { label: "Review Reports", href: "/admin/reports", icon: Flag, tone: "from-amber-400 to-orange-500" },
  { label: "Manage Withdrawals", href: "/admin/withdrawals", icon: Landmark, tone: "from-emerald-400 to-teal-500" },
  { label: "Creator Revenue", href: "/admin/creator-revenue", icon: Sparkles, tone: "from-fuchsia-400 to-pink-500" },
  { label: "Wallet", href: "/admin/wallet", icon: Wallet, tone: "from-teal-400 to-emerald-500" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, tone: "from-indigo-400 to-violet-500" },
  { label: "Audit Logs", href: "/admin/audit-log", icon: ShieldCheck, tone: "from-slate-400 to-slate-600" },
];

export function QuickActionsDropdown({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/10 dark:text-white"
      >
        <Zap size={15} className="text-cyan-500" />
        Quick actions
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={`absolute top-full z-50 mt-2 w-64 rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/95 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <p className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Admin shortcuts
            </p>
            <div className="grid grid-cols-1 gap-1">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${action.tone} text-white`}>
                      <Icon size={15} />
                    </span>
                    <span className="flex-1">{action.label}</span>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}