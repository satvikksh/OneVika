// app/premium-theme-provider.tsx
"use client";

import { createContext, useContext, useEffect } from "react";
import { useUserAvatar } from "@/app/hooks/useUserAvatar";

/* =====================================================================
   PremiumThemeProvider
   Single, global source of truth for Premium UI state.
   - Determines Premium membership from the real server/auth session
     (via useUserAvatar -> /api/user/profile), NEVER from localStorage/
     URL params/hardcoded values.
   - Toggles <html class="premium"> on/off.
   - Automatically reverts to the standard theme when Premium expires or
     becomes inactive (the hook re-fetches on focus/visibility events).
   ===================================================================== */

interface PremiumThemeContextValue {
  isPremium: boolean;
  premiumLoading: boolean;
}

const PremiumThemeContext = createContext<PremiumThemeContextValue | undefined>(
  undefined,
);

export function PremiumThemeProvider({ children }: { children: React.ReactNode }) {
  const { isPremium, loading } = useUserAvatar();

  /* Apply / remove the global premium class (single source of truth). */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("premium", isPremium && !loading);
  }, [isPremium, loading]);

  return (
    <PremiumThemeContext.Provider
      value={{ isPremium: isPremium && !loading, premiumLoading: loading }}
    >
      {children}
    </PremiumThemeContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* HOOK */
/* ------------------------------------------------------------------ */

export function usePremiumTheme() {
  const context = useContext(PremiumThemeContext);
  /* Defensive: outside a provider, default to inactive rather than crash. */
  if (!context) {
    return { isPremium: false, premiumLoading: false };
  }
  return context;
}