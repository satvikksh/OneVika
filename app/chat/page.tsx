// app/chat/page.tsx
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Dynamically import ChatPage to ensure it's client-side only
const ChatPage = dynamic(() => import("./ChatPage"), {
  ssr: false, // Disable server-side rendering for this component
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      <span className="ml-2">Loading chat...</span>
    </div>
  ),
});

// Also wrap with SocketProvider
import { SocketProvider } from "../context/SocketContext";

export default function ChatPageRoute() {
  return (
    <SocketProvider>
      <Suspense 
        fallback={
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-2">Loading chat...</span>
          </div>
        }
      >
        <ChatPage />
      </Suspense>
    </SocketProvider>
  );
}