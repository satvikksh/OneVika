"use client";

import { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { SocketProvider } from "./SocketContext";
import { CallProvider } from "./CallContext";

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  return (
    <AuthProvider>
      <SocketProvider>
        <CallProvider>{children}</CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
