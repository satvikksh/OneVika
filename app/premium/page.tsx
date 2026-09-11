"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BadgeCheck,
  Check,
  Crown,
  Globe,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

import { PremiumBadge } from "@/app/components/premium-ui";

type Plan = {
  key: string;
  name: string;
  description?: string;
  pricePaise: number;
  priceRupees: number;
  currency: string;
  durationDays: number;
  features: string[];
  displayOrder: number;
};

type PremiumStatus = {
  isPremium: boolean;
  premiumExpiresAt: string | null;
  daysRemaining: number;
  premiumPlan?: string | null;
  paymentMethod?: { brand?: string; last4?: string } | null;
};

type Notice = { kind: "info" | "success" | "error" | "pending"; text: string } | null;

const FALLBACK_PLANS: Plan[] = [
  {
    key: "monthly",
    name: "Monthly",
    description: "Full Premium access for one month.",
    pricePaise: 4900,
    priceRupees: 49,
    currency: "INR",
    durationDays: 30,
    displayOrder: 1,
    features: [
      "Keyword search in Jobs",
      "Keyword search in Discover",
      "Advanced location & filters",
      "AI Polished Chat & Thoughts",
      "Premium profile badge & theme",
    ],
  },
  {
    key: "halfyearly",
    name: "6 Months",
    description: "Six months of Premium. Save ₹45 vs monthly.",
    pricePaise: 24900,
    priceRupees: 249,
    currency: "INR",
    durationDays: 180,
    displayOrder: 2,
    features: [
      "Everything in Monthly",
      "One free month vs monthly",
      "Advanced filters & location",
      "Priority AI responses",
      "Premium profile badge & theme",
    ],
  },
  {
    key: "yearly",
    name: "12 Months",
    description: "Best value. A full year of Premium. Save ₹139 vs monthly.",
    pricePaise: 44900,
    priceRupees: 449,
    currency: "INR",
    durationDays: 365,
    displayOrder: 3,
    features: [
      "Everything in 6 Months",
      "Seven free months vs monthly",
      "Lowest effective price",
      "Priority AI responses",
      "Premium profile badge & theme",
    ],
  },
];

const PLAN_TOOLS = [
  { icon: Search, title: "Premium Search", text: "Keyword search across Jobs and Discover with advanced filters and location controls." },
  { icon: Wand2, title: "AI Polished Writing", text: "Polished, confident messages and thoughts with AI before you send." },
  { icon: Zap, title: "Faster AI Responses", text: "Priority AI responses and premium chat experience." },
  { icon: ShieldCheck, title: "Exclusive Badge", text: "A golden profile ring, Premium badge and a one-of-a-kind theme." },
];

const PLAN_BENEFITS = [
  "Keyword search in Jobs",
  "Keyword search in Discover",
  "Advanced location & filters",
  "AI Polished Chat & Thoughts",
  "Premium badge, ring & theme",
  "Priority AI responses",
];

const AMBIENT_BG =
  "radial-gradient(circle at 12% 4%, rgba(212,167,44,0.22), transparent 42%)" +
  ",radial-gradient(circle at 88% 6%, rgba(184,134,11,0.18), transparent 40%)" +
  ",radial-gradient(circle at 50% 30%, rgba(202,160,61,0.10), transparent 48%)" +
  ",radial-gradient(circle at 6% 78%, rgba(184,134,11,0.12), transparent 44%)" +
  ",radial-gradient(circle at 94% 88%, rgba(138,100,4,0.14), transparent 46%)";

function perMonthLabel(durationDays: number, priceRupees: number) {
  if (durationDays <= 30) return "billed monthly";
  const perDay = (priceRupees * 100) / durationDays;
  const perMonth = Math.round(perDay * 30) / 100;
  return `≈ ₹${perMonth.toFixed(perMonth >= 10 ? 0 : 2)}/month`;
}

function savingLabel(durationDays: number, priceRupees: number) {
  const months = Math.round(durationDays / 30);
  const monthlyTotal = months * 49;
  const saved = monthlyTotal - priceRupees;
  if (saved <= 0) return null;
  return `Save ₹${saved}`;
}

export default function PremiumPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();

  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [plansLoading, setPlansLoading] = useState(true);
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("yearly");
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const fetchStatus = useCallback(async () => {
    if (authStatus !== "authenticated") {
      setStatus(null);
      return;
    }
    try {
      const res = await fetch("/api/premium/status", { cache: "no-store" });
      const data = await res.json();
      setStatus(data && typeof data.isPremium === "boolean" ? data : null);
    } catch {
      setStatus(null);
    }
  }, [authStatus]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/premium/plans", { cache: "no-store" });
        const data = await res.json();
        if (active && Array.isArray(data?.plans) && data.plans.length > 0) {
          setPlans(data.plans);
        }
      } catch {
        // keep fallback pricing
      } finally {
        if (active) setPlansLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const refresh = () => void fetchStatus();
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("orbitbyte:premium-status-changed", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.removeEventListener("orbitbyte:premium-status-changed", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [fetchStatus, authStatus]);

  const isAuthenticated = authStatus === "authenticated";
  const isPremiumMember = Boolean(status?.isPremium);

  const runCheckout = useCallback(
    async (planKey: string) => {
      setNotice(null);
      setBuyingKey(planKey);
      try {
        const res = await fetch("/api/premium/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planKey }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (String(data.error || "").toLowerCase().includes("already")) {
            await fetchStatus();
            setNotice({ kind: "info", text: "Your Premium membership is already active." });
            return;
          }
          setNotice({ kind: "error", text: data.error || "Unable to start premium checkout." });
          return;
        }

        const checkout = data.checkout;
        if (!checkout || !checkout.paymentSessionId) {
          setNotice({ kind: "error", text: data.error || "Payment provider could not start a checkout session." });
          return;
        }

        const scripts = Array.from(
          document.querySelectorAll<HTMLScriptElement>("script[data-cashfree-checkout]"),
        );
        if (scripts.length === 0) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
            script.async = true;
            script.setAttribute("data-cashfree-checkout", "1");
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load payment checkout"));
            document.body.appendChild(script);
          });
        }

        interface CashfreeInstance {
          checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => Promise<unknown>;
        }
        interface CashfreeSdkConstructor {
          new (opts: { mode: "production" | "sandbox" }): CashfreeInstance;
        }
        const CashfreeSdk = (window as unknown as { Cashfree?: CashfreeSdkConstructor }).Cashfree;
        if (!CashfreeSdk) {
          setNotice({ kind: "error", text: "Payment checkout is unavailable. Please try again." });
          return;
        }

        const isProduction = String(checkout.environment || "").includes("production");
        const cashfree = new CashfreeSdk({ mode: isProduction ? "production" : "sandbox" });
        await cashfree.checkout({
          paymentSessionId: checkout.paymentSessionId,
          redirectTarget: "_modal",
        });

        try {
          const activateRes = await fetch("/api/premium/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId: data.transactionId }),
          });
          const activateData = await activateRes.json().catch(() => ({}));
          if (!activateRes.ok) {
            if (String(activateData.code || "").toUpperCase() === "PENDING") {
              setNotice({ kind: "pending", text: "Waiting for payment confirmation..." });
            } else {
              setNotice({ kind: "error", text: activateData.error || "Payment confirmation failed." });
            }
          } else {
            setNotice({
              kind: "success",
              text: activateData.alreadyProcessed
                ? "Premium membership is already active."
                : "Premium activated successfully.",
            });
          }
        } catch {
          setNotice({ kind: "error", text: "Payment confirmed, but activation could not be verified right now." });
        } finally {
          await fetchStatus();
          window.dispatchEvent(new Event("orbitbyte:premium-status-changed"));
        }
      } catch (err) {
        setNotice({ kind: "error", text: err instanceof Error ? err.message : "Unable to start premium checkout." });
      } finally {
        setBuyingKey(null);
      }
    },
    [fetchStatus],
  );

  const onBuy = useCallback(
    (planKey: string) => {
      setNotice(null);
      if (!isAuthenticated) {
        router.push("/login?callbackUrl=/premium");
        return;
      }
      if (isPremiumMember) {
        setNotice({ kind: "info", text: "You already have active Premium." });
        return;
      }
      void runCheckout(planKey);
    },
    [isAuthenticated, isPremiumMember, router, runCheckout],
  );

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.displayOrder - b.displayOrder),
    [plans],
  );

  const expiryLabel = status?.premiumExpiresAt
    ? new Date(status.premiumExpiresAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const planName = status?.premiumPlan
    ? String(status.premiumPlan)
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ background: AMBIENT_BG, filter: "blur(16px)" }}
      />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        {/* ============ HERO / BRANDING ============ */}
        <section className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-200 to-rose-300 shadow-2xl shadow-amber-500/30">
            <Crown className="h-9 w-9 text-stone-950" />
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <h1 className="bg-gradient-to-r from-yellow-200 via-amber-300 to-slate-200 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
              OrbitByte Premium
            </h1>
            <span className="flex h-9 w-9 items-center justify-center">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </span>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
            Unlock the full power of OrbitByte — premium search, advanced filters,
            AI-polished writing, priority AI responses and an exclusive golden identity.
          </p>
        </section>

        {/* ============ STATUS FOR ACTIVE PREMIUM ============ */}
        {isPremiumMember && (
          <section className="mx-auto mt-10 max-w-3xl">
            <div className="rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-400/15 via-stone-950/80 to-stone-950/80 p-6 shadow-[0_0_40px_-12px_rgba(212,167,44,0.5)] sm:p-8">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 text-stone-950 shadow-lg shadow-amber-500/30">
                    <BadgeCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-lg font-black">
                      Premium Active
                      <PremiumBadge label="Member" />
                    </p>
                    {expiryLabel && (
                      <p className="mt-1 text-sm text-white/70">
                        Valid until <span className="font-semibold text-amber-200">{expiryLabel}</span>
                      </p>
                    )}
                  </div>
                </div>
                {status?.daysRemaining !== undefined && (
                  <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-1.5 text-sm font-bold text-amber-200">
                    {status.daysRemaining} day{status.daysRemaining === 1 ? "" : "s"} left
                  </span>
                )}
              </div>

              {(planName || status?.paymentMethod?.last4) && (
                <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/60">
                  {planName && <span className="font-semibold text-white/80">Plan: {planName}</span>}
                  {planName && status?.paymentMethod?.last4 && <span> · </span>}
                  {status?.paymentMethod?.last4 && (
                    <span>
                      Paid via {status.paymentMethod.brand || "Card"} ending in {status.paymentMethod.last4}
                    </span>
                  )}
                </p>
              )}

              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {PLAN_BENEFITS.slice(0, 3).map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    {benefit}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  View your profile
                </Link>
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-300 px-5 py-2.5 text-sm font-black text-stone-950 shadow-lg shadow-amber-500/20 transition hover:brightness-105"
                >
                  Explore Premium Search
                  <Globe className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ============ PLANS ============ */}
        {!isPremiumMember && (
          <section className="mt-12">
            <div className="text-center">
              <h2 className="text-xl font-black sm:text-2xl">Choose your plan</h2>
              <p className="mt-2 text-sm text-white/60">
                One-time payment, securely billed through Cashfree. No hidden charges.
              </p>
            </div>

            {plansLoading ? (
              <div className="mx-auto mt-8 flex h-40 max-w-sm items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-amber-400" />
              </div>
            ) : (
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {sortedPlans.map((plan) => {
                  const highlighted = plan.key === "yearly";
                  const selected = plan.key === selectedKey;
                  const price =
                    Number.isFinite(plan.priceRupees) && plan.priceRupees > 0
                      ? plan.priceRupees
                      : Math.round(plan.pricePaise / 100);
                  const savings = savingLabel(plan.durationDays, price);
                  const pace = perMonthLabel(plan.durationDays, price);

                  return (
                    <div
                      key={plan.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedKey(plan.key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedKey(plan.key);
                        }
                      }}
                      aria-pressed={selected}
                      className={`group relative w-full cursor-pointer text-left transition-transform duration-200 ${
                        highlighted ? "md:-translate-y-2 md:scale-[1.02]" : "hover:-translate-y-1"
                      }`}
                    >
                      {highlighted && (
                        <span className="pointer-events-none absolute -inset-px z-0 rounded-3xl bg-[conic-gradient(from_180deg_at_50%_50%,#fde68a_0deg,#f59e0b_90deg,#f8fafc_180deg,#fbbf24_270deg,#fde68a_360deg)] p-[2px] shadow-[0_0_36px_rgba(251,191,36,0.35)]" />
                      )}
                      <div
                        className={`relative z-10 flex h-full flex-col rounded-3xl border p-6 backdrop-blur-xl transition ${
                          highlighted
                            ? "border-transparent bg-stone-950/95"
                            : selected
                              ? "border-amber-300/40 bg-stone-950/90 shadow-[0_0_24px_-8px_rgba(212,167,44,0.35)]"
                              : "border-white/10 bg-[#0a0b12]/90"
                        }`}
                      >
                        {highlighted && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-300 px-4 py-1 text-xs font-black uppercase tracking-wide text-stone-950 shadow-lg shadow-amber-500/30">
                            Best Value
                          </span>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/70">
                            {plan.name}
                          </p>
                          {highlighted && <PremiumBadge label="Recommended" />}
                        </div>

                        <div className="mt-5 flex items-baseline gap-1">
                          <span className="text-lg font-bold text-white/70">₹</span>
                          <span
                            className={`text-4xl font-black tracking-tight ${
                              highlighted ? "bg-gradient-to-r from-yellow-200 to-amber-400 bg-clip-text text-transparent" : "text-white"
                            }`}
                          >
                            {price}
                          </span>
                          <span className="ml-1 text-sm text-white/50">/ {plan.durationDays} days</span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-white/45">{pace}</p>

                        {savings && (
                          <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                            <Sparkles className="h-3 w-3" />
                            {savings}
                          </span>
                        )}

                        {plan.description && (
                          <p className="mt-4 text-sm leading-6 text-white/60">{plan.description}</p>
                        )}

                        <ul className="mt-5 space-y-2.5">
                          {(plan.features.length ? plan.features : PLAN_BENEFITS).map((feature) => (
                            <li key={feature} className="flex items-start gap-2.5 text-sm text-white/80">
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                  highlighted
                                    ? "bg-amber-300/20 text-amber-300"
                                    : "bg-emerald-400/10 text-emerald-300"
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </span>
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-6 flex flex-1 items-end">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onBuy(plan.key);
                            }}
                            disabled={buyingKey === plan.key}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black transition active:scale-[0.98] disabled:opacity-60 ${
                              highlighted
                                ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-300 text-stone-950 shadow-lg shadow-amber-500/25 hover:brightness-105"
                                : selected
                                  ? "bg-amber-400/90 text-stone-950 hover:bg-amber-300"
                                  : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                            }`}
                          >
                            <Crown className="h-4 w-4" />
                            {buyingKey === plan.key ? "Opening checkout..." : "Buy Premium"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {notice && (
              <div
                className={`mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-2xl border px-5 py-4 text-sm ${
                  notice.kind === "success"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : notice.kind === "error"
                      ? "border-red-400/30 bg-red-400/10 text-red-200"
                      : notice.kind === "pending"
                        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
                        : "border-white/10 bg-white/5 text-white/70"
                }`}
                role="status"
              >
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                {notice.text}
              </div>
            )}

            {!isAuthenticated && (
              <p className="mt-6 text-center text-sm text-white/50">
                You will need to{" "}
                <Link href="/login?callbackUrl=/premium" className="font-bold text-amber-300 underline underline-offset-4">
                  log in
                </Link>{" "}
                to complete your purchase.
              </p>
            )}
          </section>
        )}

        {/* ============ WHY PREMIUM ============ */}
        <section className="mt-16 sm:mt-20">
          <h2 className="text-center text-xl font-black sm:text-2xl">Everything Premium unlocks</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_TOOLS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition hover:border-amber-300/30 hover:shadow-[0_0_28px_-10px_rgba(212,167,44,0.4)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300/20 to-rose-300/10 text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <ul className="grid gap-3 sm:grid-cols-2">
              {PLAN_BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============ TRUST / SMALL PRINT ============ */}
        <section className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <ShieldCheck className="h-4 w-4 text-amber-300" />
            Payments are securely processed by Cashfree (UPI, cards & netbanking).
          </div>
          <p className="max-w-xl text-xs leading-5 text-white/40">
            Your Premium activation is applied automatically only after the payment is verified.
            Need help? Visit your{" "}
            <Link href="/payments" className="font-semibold text-amber-300/90 underline underline-offset-4">
              payment history
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}