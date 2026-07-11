"use client";

import { Check, Crown, Sparkles, X } from "lucide-react";

type PremiumUpgradePromptProps = {
  title?: string;
  description?: string;
  onClose: () => void;
  onUpgrade: () => void;
  className?: string;
};

const benefits = [
  "AI Polished Messages",
  "Better Writing",
  "Faster AI Responses",
  "Premium Chat Experience",
  "More Premium Features",
];

export default function PremiumUpgradePrompt({
  title = "Unlock AI Polished Chat",
  description = "Improve your messages with AI before sending.",
  onClose,
  onUpgrade,
  className = "",
}: PremiumUpgradePromptProps) {
  return (
    <>
      <style>
        {`@keyframes premiumPromptIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>
      <div
        className={`overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl shadow-amber-900/10 transition-all duration-200 dark:border-amber-500/30 dark:bg-stone-950 dark:shadow-black/40 ${className}`}
        style={{ animation: "premiumPromptIn 0.22s ease-out" }}
      >
        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-400" />
        <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-yellow-200 to-rose-200 text-amber-900 shadow-sm">
            <Crown className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-stone-950 dark:text-white">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  {title}
                </p>
                <p className="mt-1 text-sm leading-5 text-stone-600 dark:text-stone-300">
                  {description}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-900 dark:hover:text-stone-200"
                aria-label="Close premium upgrade prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-200"
                >
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {benefit}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-900"
              >
                Maybe Later
              </button>
              <button
                type="button"
                onClick={onUpgrade}
                className="rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-300 px-4 py-2 text-sm font-bold text-stone-950 shadow-lg shadow-amber-500/20 transition hover:brightness-105 active:scale-[0.99]"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
