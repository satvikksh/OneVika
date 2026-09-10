"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Lock } from "lucide-react";
import PremiumUpgradePrompt from "./PremiumUpgradePrompt";

/**
 * Shared premium-search lock used by the Jobs and Discover sections.
 *
 * UI-only affordance: the real enforcement lives server-side in the Jobs and
 * Discover API routes (see app/lib/premium-search.ts), which reject keyword
 * requests from non-premium users with 402 PREMIUM_REQUIRED.
 */

export function usePremiumSearchPrompt() {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const openPrompt = useCallback(() => setOpen(true), []);
  const closePrompt = useCallback(() => setOpen(false), []);

  const upgrade = useCallback(() => {
    // Existing OrbitByte upgrade flow: the checkout lives on the user's own
    // profile (same deep-link used across chat & posts).
    const id = session?.user?.id;
    router.push(id ? `/profile/${id}#premium-membership` : "/profile#premium-membership");
  }, [router, session?.user?.id]);

  return { open, openPrompt, closePrompt, upgrade };
}

export function PremiumSearchPromptModal({
  open,
  onClose,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Premium search upgrade prompt"
    >
      <div className="w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <PremiumUpgradePrompt
          title="Premium Search"
          description="Search is available for Premium members. Upgrade to search jobs and news by keywords and unlock advanced filters."
          benefits={[
            "Keyword search in Jobs",
            "Keyword search in Discover",
            "Advanced filters & sorting",
            "Location-based content stays free",
            "Unlock more Premium features",
          ]}
          onClose={onClose}
          onUpgrade={onUpgrade}
        />
      </div>
    </div>
  );
}

/** Small "Premium Search" pill with a lock icon for non-premium surfaces. */
export function PremiumSearchBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-300/30 ${className}`}
    >
      <Lock className="h-3 w-3" />
      Premium Search
    </span>
  );
}