"use client";

import { LucideIcon, RefreshCw } from "lucide-react";

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  onRetry,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/[0.05]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
        <Icon size={22} />
      </div>
      <h2 className="mt-5 text-xl font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {onRetry ? (
        <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
          <RefreshCw size={16} /> Retry
        </button>
      ) : null}
    </div>
  );
}
