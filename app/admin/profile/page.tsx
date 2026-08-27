"use client";

import { useSession } from "next-auth/react";
import { ShieldCheck, UserCog } from "lucide-react";

export default function AdminProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Admin identity</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Admin Profile</h2>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-slate-950 text-2xl font-black text-white dark:bg-white dark:text-slate-950">
            {(session?.user?.name || "OrbitByte Admin").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-2xl font-black">{session?.user?.name || "OrbitByte Admin"}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{session?.user?.email || "admin@orbitbyte.com"}</p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
              <ShieldCheck size={14} /> {session?.user?.role || "ADMIN"}
            </span>
          </div>
        </div>
      </section>
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-white/15 dark:bg-white/[0.04]">
        <UserCog className="mx-auto text-slate-400" />
        <h3 className="mt-4 font-black">Profile management is not exposed</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">This page uses the active admin session. Editing admin profile details requires a backend endpoint before changes can be persisted.</p>
      </section>
    </div>
  );
}
