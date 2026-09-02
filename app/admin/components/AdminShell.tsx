"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bell,
  ChevronLeft,
  CircleDollarSign,
  Crown,
  FileText,
  Flag,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Receipt,
  ScanSearch,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Undo2,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useTheme } from "@/app/theme-provider";
import { QuickActionsDropdown } from "./QuickActions";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Posts & Videos", href: "/admin/posts", icon: FileText },
  { label: "Reports", href: "/admin/reports", icon: Flag },
  { label: "Withdrawals", href: "/admin/withdrawals", icon: CircleDollarSign },
  { label: "Earnings", href: "/admin/earnings", icon: Activity },
  { label: "Creator Revenue", href: "/admin/creator-revenue", icon: Sparkles },
  { label: "Wallet", href: "/admin/wallet", icon: Wallet },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Audit Logs", href: "/admin/audit-log", icon: ShieldCheck },
  { label: "Admin Profile", href: "/admin/profile", icon: UserCog },
  { label: "Premium", href: "/admin/premium", icon: Crown },
  { label: "Premium Revenue", href: "/admin/premium-revenue", icon: Landmark },
  { label: "Payments", href: "/admin/payments", icon: Receipt },
  { label: "Refunds", href: "/admin/refunds", icon: Undo2 },
  { label: "Reconciliation", href: "/admin/reconciliation", icon: ScanSearch },
];

function initials(name?: string | null, email?: string | null) {
  const value = name || email || "OrbitByte Admin";
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Sidebar({
  collapsed,
  onCollapse,
  onClose,
  mobile = false,
}: {
  collapsed: boolean;
  onCollapse: () => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex h-full flex-col border-r border-slate-200/70 bg-white/85 text-slate-900 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/82 dark:text-white ${
        collapsed && !mobile ? "w-[86px]" : "w-[292px]"
      }`}
    >
      <div className="flex h-20 items-center justify-between px-5">
        <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3">
           <div className="relative w-10 h-10 transition-transform group-hover:scale-105 max-md:h-9 max-md:w-9">
                          <Image
                            src="/img/icon25.png"
                            alt="OrbitByte"
                            width={40}
                            height={40}
                            className="object-contain"
                            priority
                          />
                        </div>
          {!collapsed || mobile ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-wide">OrbitByte</p>
              <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">Admin Console</p>
            </div>
          ) : null}
        </Link>
        {mobile ? (
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close admin menu">
            <X size={18} />
          </button>
        ) : (
          <button onClick={onCollapse} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Collapse admin menu">
            <ChevronLeft className={collapsed ? "rotate-180 transition" : "transition"} size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed && !mobile ? item.label : undefined}
              className={`group relative flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition ${
                active
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              }`}
            >
              {active ? <span className="absolute left-0 h-6 w-1 rounded-r-full bg-cyan-300" /> : null}
              <Icon size={18} className="shrink-0" />
              {!collapsed || mobile ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/70 p-3 dark:border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10"
        >
          <LogOut size={18} />
          {!collapsed || mobile ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const title = useMemo(() => {
    const current = navItems.find((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`));
    return current?.label || "Admin";
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  const adminName = session?.user?.name || "OrbitByte Admin";
  const adminEmail = session?.user?.email || "admin@orbitbyte.com";

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#070a12] dark:text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,.18),transparent_34%),radial-gradient(circle_at_80%_0,rgba(124,58,237,.14),transparent_34%),linear-gradient(180deg,rgba(248,199,107,.08),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,.16),transparent_34%),radial-gradient(circle_at_80%_0,rgba(124,58,237,.18),transparent_34%),linear-gradient(180deg,rgba(248,199,107,.06),transparent_42%)]" />
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} />
      </div>

      <AnimatePresence>
        {drawerOpen ? (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-label="Close admin menu" />
            <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 26, stiffness: 260 }} className="relative h-full">
              <Sidebar collapsed={false} onCollapse={() => undefined} onClose={() => setDrawerOpen(false)} mobile />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-[86px]" : "lg:pl-[292px]"}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/78 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
          <div className="flex min-h-20 items-center gap-3 px-4 sm:px-6">
            <button onClick={() => setDrawerOpen(true)} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/10 lg:hidden" aria-label="Open admin menu">
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">Admin</p>
              <h1 className="truncate text-xl font-black sm:text-2xl">{title}</h1>
            </div>
            <div className="ml-auto hidden h-12 min-w-[260px] max-w-md flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 shadow-inner dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400 md:flex">
              <Search size={17} />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search admin workspace" />
            </div>
            <QuickActionsDropdown />
            <button className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/10" aria-label="Admin notifications">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-400" />
            </button>
            <button onClick={toggleTheme} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/10" aria-label="Toggle admin theme">
              {mounted && theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/10 sm:flex">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                {initials(adminName, adminEmail)}
              </div>
              <div className="min-w-0">
                <p className="max-w-[150px] truncate text-sm font-black">{adminName}</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">ADMIN</p>
              </div>
            </div>
          </div>
        </header>
        <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="min-h-[calc(100vh-80px)] px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </motion.main>
      </div>
    </div>
  );
}
