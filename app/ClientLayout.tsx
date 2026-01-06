"use client";

import { SessionProvider } from "next-auth/react";
import { Providers } from "./providers";
import Navbar from "./components/navbar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <Providers>
        <Navbar />
        {children}
      </Providers>
    </SessionProvider>
  );
}
