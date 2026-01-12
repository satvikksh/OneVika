// components/SocketInitializer.tsx
"use client";

import { useEffect } from "react";
import { useSocket } from "../context/SocketContext";

export default function SocketInitializer() {
  const { isConnected } = useSocket();
  
  useEffect(() => {
    // You can add any socket initialization logic here
    console.log("Socket connection status:", isConnected);
  }, [isConnected]);
  
  return null; // This component doesn't render anything
}