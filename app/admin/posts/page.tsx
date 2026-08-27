"use client";

import { FileText, Search } from "lucide-react";

import { AdminEmptyState } from "../components/AdminEmptyState";

export default function AdminPostsPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Content operations</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Posts</h2>
      </section>
      <div className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white/75 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <Search size={17} className="text-slate-400" />
        <input placeholder="Search posts" className="w-full bg-transparent text-sm outline-none" />
      </div>
      <AdminEmptyState icon={FileText} title="No admin posts API is available" description="Post review, sorting, reports, and moderation actions can be rendered here when a dedicated admin content endpoint exists." />
    </div>
  );
}
