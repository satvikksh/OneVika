"use client";

import { useState } from "react";
import { Activity, BarChart3, LineChart } from "lucide-react";

import { AdminEmptyState } from "../components/AdminEmptyState";

const filters = ["Today", "7 Days", "30 Days", "3 Months", "1 Year"];

export default function AdminAnalyticsPage() {
  const [filter, setFilter] = useState("30 Days");

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Platform intelligence</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Analytics</h2>
        </div>
        <div className="flex flex-wrap rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/10">
          {filters.map((item) => (
            <button key={item} onClick={() => setFilter(item)} className={`rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm ${filter === item ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400"}`}>{item}</button>
          ))}
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        {["User Growth", "Daily Active Users", "Posts Created", "Engagement", "Creator Earnings", "Withdrawals", "Platform Revenue"].map((title, index) => (
          <div key={title} className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
            <div className="flex items-center justify-between">
              <h3 className="font-black">{title}</h3>
              {index % 2 ? <Activity className="text-violet-500" size={18} /> : <LineChart className="text-cyan-500" size={18} />}
            </div>
            <div className="mt-5">
              <AdminEmptyState icon={BarChart3} title="No chart data available" description={`No real ${title.toLowerCase()} time-series endpoint is available for ${filter}.`} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
