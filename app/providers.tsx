"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./theme-provider";
import { PremiumThemeProvider } from "./premium-theme-provider";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <PremiumThemeProvider>
          {children}
        </PremiumThemeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
