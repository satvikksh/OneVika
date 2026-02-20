"use client";

import { SessionProvider } from "next-auth/react";
import { Providers } from "./providers";
import Navbar from "./components/navbar";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <Providers>
        <SocketProvider>
          <NotificationProvider>
            <Navbar />

            <main
              className={`
                pt-16                 /* top navbar height */
                pb-16 lg:pb-0         /* bottom nav only on mobile */
              `}
            >
              {children}
            </main>
          </NotificationProvider>
        </SocketProvider>
      </Providers>
    </SessionProvider>
  );
}
