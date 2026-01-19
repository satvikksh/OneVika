// app/chat/layout.tsx
import { SocketProvider } from "../context/SocketContext";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocketProvider>
      {children}
    </SocketProvider>
  );
}
