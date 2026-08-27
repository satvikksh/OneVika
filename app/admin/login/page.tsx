"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { AlertCircle, ArrowRight, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("admin-credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/admin/dashboard",
    });
    setLoading(false);
    if (result?.error) {
      if (result.error.includes("not configured")) {
        setError("Admin authentication is not configured");
      } else if (result.error.includes("Admin access required")) {
        setError("Admin access required");
      } else {
        setError("Invalid admin credentials");
      }
      return;
    }
    window.location.href = "/admin/dashboard";
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-50 p-4 text-slate-950 dark:bg-[#070a12] dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0,rgba(0,212,255,.22),transparent_32%),radial-gradient(circle_at_84%_12%,rgba(124,58,237,.20),transparent_30%),linear-gradient(180deg,rgba(248,199,107,.10),transparent_48%)]" />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/82 p-6 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/78"
      >
        <div className="flex items-center gap-3">
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
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">OrbitByte</p>
            <h1 className="text-2xl font-black">Admin Console</h1>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex items-center gap-2 text-sm font-black">
            <ShieldCheck size={17} className="text-emerald-500" /> Secure administrator sign in
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Use the server-configured administrator credentials.</p>
        </div>

        {error ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
            <AlertCircle size={16} /> {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          <label className="grid gap-2 text-sm font-black">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="admin@orbitbyte.com" className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-white/10" />
          </label>
          <label className="grid gap-2 text-sm font-black">
            Password
            <span className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-cyan-400 dark:border-white/10 dark:bg-white/10">
              <LockKeyhole size={16} className="text-slate-400" />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Password" className="w-full bg-transparent text-sm outline-none" />
            </span>
          </label>
        </div>

        <button type="submit" disabled={loading} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 disabled:opacity-60 dark:bg-white dark:text-slate-950">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />} Sign in
        </button>
      </motion.form>
    </main>
  );
}
