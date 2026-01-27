"use client";

import dynamic from "next/dynamic";
import { SocketProvider } from "../context/SocketContext";

// Dynamically import ChatPage to ensure it's client-side only
const ChatPage = dynamic(() => import("./ChatPage"), {
  ssr: false,
});

export default function ChatPageRoute() {
  return (
    <SocketProvider>
      <ChatPage />
    </SocketProvider>
  );
}