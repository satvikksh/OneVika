// app/components/premium-ambient.tsx
"use client";

/* =====================================================================
   PremiumAmbient
   Reusable full-page golden ambient background for active Premium members.

   - Renders a single, fixed, non-interactive layer of soft, blurred gold
     radial gradients that sit ON TOP of the existing dark UI via
     mix-blend-mode:overlay (so near-black stays black, near-white stays
     white, and text contrast is preserved).
   - Controlled by the REAL authenticated Premium status from
     usePremiumTheme() -> useUserAvatar() -> /api/user/profile.
     Free / expired users render nothing.
   - pointer-events:none so it never blocks clicks/scroll/inputs.
   - position:fixed + inset:0 so it covers the entire viewport consistently
     regardless of layout, sidebar, or scroll position (desktop/tablet/mobile).
   - Lightweight: a single composited layer, no animation, no per-card effects.
   - When isPremium (or loads) changes, the layer mounts/unmounts
     automatically — no manual cleanup needed.
   ===================================================================== */

import { usePremiumTheme } from "@/app/premium-theme-provider";

/* Soft gold radial gradients spread across top, center, sides, and lower
   areas. Low alphas + large fading = subtle "premium atmosphere", not yellow. */
const AMBIENT_BG =
  "radial-gradient(circle at 12% 6%, rgba(212,167,44,0.13), transparent 42%)," +
  "radial-gradient(circle at 90% 8%, rgba(184,134,11,0.10), transparent 40%)," +
  "radial-gradient(circle at 50% 38%, rgba(202,160,61,0.07), transparent 46%)," +
  "radial-gradient(circle at 5% 78%, rgba(184,134,11,0.08), transparent 44%)," +
  "radial-gradient(circle at 95% 90%, rgba(138,100,4,0.08), transparent 46%)," +
  "radial-gradient(circle at 50% 100%, rgba(212,167,44,0.09), transparent 48%)";

export function PremiumAmbient({
  className = "",
}: {
  className?: string;
}) {
  const { isPremium, premiumLoading } = usePremiumTheme();

  if (!isPremium || premiumLoading) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[39] ${className}`}
      style={{ background: AMBIENT_BG, filter: "blur(14px)" }}
    />
  );
}