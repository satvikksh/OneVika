"use client";

import { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { SocketProvider } from "./SocketContext";

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  return (
    <AuthProvider>
      <SocketProvider>{children}</SocketProvider>
    </AuthProvider>
  );
}
