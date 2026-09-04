"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Providers } from "./providers";
import Navbar from "./components/navbar";
import MobileBackBar from "./components/MobileBackBar";
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
  const isHomeRoute = pathname === "/";

  // The Admin Panel intentionally keeps its own theme. Gate the global
  // Premium ambient layer off on admin routes (PremiumThemeProvider still
  // toggles <html class="premium">; only the ambient background is excluded).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isAdminRoute) {
      document.body.setAttribute("data-ambient", "off");
    } else {
      document.body.removeAttribute("data-ambient");
    }
  }, [isAdminRoute]);

  // Pages that already render their own working Back button (or are fullscreen
  // with their own top controls) must not get a duplicate one.
  const hasOwnBackButton = Boolean(
    pathname &&
      (pathname.startsWith("/profile") ||
        pathname === "/chat" ||
        pathname === "/feed" ||
        pathname === "/post" ||
        pathname.startsWith("/room/"))
  );

  const showMobileBackBar = !isAdminRoute && !isHomeRoute && !hasOwnBackButton;

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
              {showMobileBackBar && <MobileBackBar />}
              <main
                className={`${isHomeRoute ? "pt-16" : "lg:pt-16"} pb-16 lg:pb-0`}
              >
                {children}
              </main>
              <CallModal />
            </NotificationProvider>
          </CallProvider>
        </SocketProvider>
      )}
    </Providers>
  );
}
