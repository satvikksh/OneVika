"use client";

import { useEffect, useState } from "react";
import { BarChart3, CircleDollarSign, Loader2, TrendingUp, Users } from "lucide-react";

import { AdminEmptyState } from "../components/AdminEmptyState";

type Overview = {
  totalCreators?: number;
  totalEarningsGenerated?: number;
  totalWithdrawn?: number;
  totalEligibleLikes?: number;
};

const cards = [
  { label: "Total creator earnings", key: "totalEarningsGenerated", icon: CircleDollarSign, kind: "money" },
  { label: "Paid earnings", key: "totalWithdrawn", icon: TrendingUp, kind: "money" },
  { label: "Top creators counted", key: "totalCreators", icon: Users, kind: "number" },
  { label: "Eligible likes", key: "totalEligibleLikes", icon: BarChart3, kind: "number" },
] as const;

function money(value?: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

export default function AdminEarningsPage() {
  const [data, setData] = useState<Overview>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load earnings");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load earnings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Creator finance</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Earnings</h2>
      </section>
      {error ? <AdminEmptyState icon={CircleDollarSign} title={error} description="Retry loading the existing admin overview endpoint." onRetry={load} /> : null}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-white/75 dark:bg-white/10" />)}</div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const rawValue = data[card.key];
            const value = card.kind === "money" ? money(rawValue) : new Intl.NumberFormat("en-IN").format(rawValue || 0);
            return (
              <div key={card.key} className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
                <Icon className="text-cyan-500" size={22} />
                <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </div>
            );
          })}
        </section>
      )}
      <AdminEmptyState icon={BarChart3} title="No earnings trend API is available" description="Pending earnings, platform share, top creator rows, and transaction streams need dedicated admin endpoints before they can display real data." />
    </div>
  );
}
