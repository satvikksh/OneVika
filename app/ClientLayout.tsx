"use client";

import { usePathname } from "next/navigation";
import { Providers } from "./providers";
import Navbar from "./components/navbar";
import NotificationListener from "./components/NotificationListener";
import CallModal from "./components/CallModal";
import { CallProvider } from "./context/CallContext";
import { NotificationProvider } from "./context/NotificationContext";
import { SocketProvider } from "./context/SocketContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <Providers>
      {isAdminRoute ? (
        children
      ) : (
        <SocketProvider>
          <CallProvider>
            <NotificationProvider>
              <NotificationListener />
              <Navbar />
              <main className="pt-16 pb-16 lg:pb-0">{children}</main>
              <CallModal />
            </NotificationProvider>
          </CallProvider>
        </SocketProvider>
      )}
    </Providers>
  );
}
