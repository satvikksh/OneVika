"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Brain, CircleDollarSign, Loader2, Lock, RefreshCw, Save, Settings, Shield, ToggleLeft, Wallet } from "lucide-react";

type AdminSettings = {
  likeRate: number;
  minimumWithdrawal: number;
  maximumWithdrawal: number | null;
  withdrawalsEnabled: boolean;
  payoutProvider: "manual" | "razorpayx";
  maintenanceMode: boolean;
};

const sections = [
  { id: "general", label: "General", icon: Settings },
  { id: "platform", label: "Platform", icon: ToggleLeft },
  { id: "earnings", label: "Earnings", icon: CircleDollarSign },
  { id: "withdrawals", label: "Withdrawals", icon: Wallet },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
  { id: "ai", label: "AI", icon: Brain },
  { id: "maintenance", label: "Maintenance", icon: Shield },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [active, setActive] = useState("earnings");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to load settings");
      setSettings(payload.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to save settings");
      setSettings(payload.settings);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeCopy = useMemo(() => {
    if (active === "earnings") return "Creator earning rates and withdrawal thresholds use real platform settings.";
    if (active === "withdrawals") return "Withdrawal availability and payout provider controls.";
    if (active === "maintenance") return "Operational controls for scheduled platform maintenance.";
    return "No editable controls are exposed by the current admin settings API.";
  }, [active]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Platform controls</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Settings</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black shadow-sm dark:border-white/10 dark:bg-white/10">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={save} disabled={!settings || saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60 dark:bg-white dark:text-slate-950">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save
          </button>
        </div>
      </section>

      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</div> : null}
      {saved ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">Settings saved.</div> : null}

      <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <nav className="rounded-3xl border border-slate-200 bg-white/75 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActive(section.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                  active === section.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
              >
                <Icon size={17} /> {section.label}
              </button>
            );
          })}
        </nav>

        <div className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <div className="border-b border-slate-200 pb-5 dark:border-white/10">
            <h3 className="text-xl font-black">{sections.find((section) => section.id === active)?.label}</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{activeCopy}</p>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />)}
            </div>
          ) : !settings ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-white/15">
              <h4 className="font-black">No settings available</h4>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Retry loading the admin settings.</p>
            </div>
          ) : active === "earnings" ? (
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-black">Per Like Rate (INR)<input type="number" step="0.01" value={settings.likeRate} onChange={(event) => setSettings({ ...settings, likeRate: Number(event.target.value) })} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none dark:border-white/10 dark:bg-white/10" /></label>
              <label className="grid gap-2 text-sm font-black">Minimum Withdrawal (INR)<input type="number" value={settings.minimumWithdrawal} onChange={(event) => setSettings({ ...settings, minimumWithdrawal: Number(event.target.value) })} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none dark:border-white/10 dark:bg-white/10" /></label>
              <label className="grid gap-2 text-sm font-black">Maximum Withdrawal (INR)<input type="number" value={settings.maximumWithdrawal ?? ""} onChange={(event) => setSettings({ ...settings, maximumWithdrawal: event.target.value ? Number(event.target.value) : null })} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none dark:border-white/10 dark:bg-white/10" /></label>
            </div>
          ) : active === "withdrawals" ? (
            <div className="mt-5 grid gap-4">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black dark:border-white/10 dark:bg-white/10">Withdrawals enabled<input type="checkbox" checked={settings.withdrawalsEnabled} onChange={(event) => setSettings({ ...settings, withdrawalsEnabled: event.target.checked })} /></label>
              <label className="grid gap-2 text-sm font-black">Payout Provider<select value={settings.payoutProvider} onChange={(event) => setSettings({ ...settings, payoutProvider: event.target.value as AdminSettings["payoutProvider"] })} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none dark:border-white/10 dark:bg-slate-900"><option value="manual">Manual</option><option value="razorpayx">RazorpayX</option></select></label>
            </div>
          ) : active === "maintenance" ? (
            <div className="mt-5">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black dark:border-white/10 dark:bg-white/10">Maintenance mode<input type="checkbox" checked={settings.maintenanceMode} onChange={(event) => setSettings({ ...settings, maintenanceMode: event.target.checked })} /></label>
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-white/15">
              <h4 className="font-black">No editable controls</h4>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This section is ready for future admin API fields.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
