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
        
         <main
        className={`
          pt-16                 /* top navbar height */
          pb-16 lg:pb-0         /* bottom nav only on mobile */
         
        `}
      >
        {children}
      </main>
      </Providers>
    </SessionProvider>
  );
}
