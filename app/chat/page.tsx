"use client";

import dynamic from "next/dynamic";

// Dynamically import ChatPage to ensure it's client-side only
const ChatPage = dynamic(() => import("./ChatPage"), {
  ssr: false,
});

export default function ChatPageRoute() {
  return <ChatPage />;
}
