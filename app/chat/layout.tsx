// app/chat/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SocketProvider } from "../context/SocketContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chat - Real-time Messaging",
  description: "Chat with your contacts in real-time",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {/* Wrap only chat pages with SocketProvider */}
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}