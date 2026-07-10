"use client";

import { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { SocketProvider } from "./SocketContext";
import { CallProvider } from "./CallContext";
import CallModal from "../components/CallModal";

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  return (
   <AuthProvider>
      <SocketProvider>
        <CallProvider>
          {children}
          <CallModal />
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}