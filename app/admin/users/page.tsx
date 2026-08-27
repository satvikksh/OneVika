"use client";

import { Search, Users } from "lucide-react";

import { AdminEmptyState } from "../components/AdminEmptyState";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Identity management</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Users</h2>
      </section>
      <div className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white/75 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <Search size={17} className="text-slate-400" />
        <input placeholder="Search users" className="w-full bg-transparent text-sm outline-none" />
      </div>
      <AdminEmptyState icon={Users} title="No admin user-management API is available" description="The UI is ready for user search, sorting, filters, pagination, and account actions once an admin users endpoint is added." />
    </div>
  );
}
