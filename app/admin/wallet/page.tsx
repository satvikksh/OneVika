"use client";

import { Wallet } from "lucide-react";

import { AdminEmptyState } from "../components/AdminEmptyState";

export default function AdminWalletPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Financial operations</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Wallet</h2>
      </section>
      <AdminEmptyState icon={Wallet} title="No admin wallet API is available" description="Wallet balances, holds, adjustments, and ledger entries will appear here when exposed by backend endpoints." />
    </div>
  );
}
