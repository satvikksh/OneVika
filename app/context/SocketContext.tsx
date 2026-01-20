"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

/* ---------------- TYPES ---------------- */

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: string | Date;
  chatId?: string;
  type?: "text" | "image" | "file";
  status?: "sending" | "sent" | "delivered" | "read";
}

/* ---------------- CONTEXT ---------------- */

const SocketContext = createContext<unknown>(null);

/* ---------------- PROVIDER ---------------- */

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) =>
      prev.some((m) => m.id === msg.id)
        ? prev.map((m) => (m.id === msg.id ? msg : m))
        : [...prev, msg]
    );
  }, []);

  /* ---------------- CONNECT ---------------- */

  useEffect(() => {
    if (!userId || socketRef.current) return;

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!SOCKET_URL) {
      console.error("❌ NEXT_PUBLIC_SOCKET_URL not set");
      return;
    }

    console.log("🔥 Connecting socket:", SOCKET_URL);

    const socket = io(SOCKET_URL, {
      path: "/socket.io",
      withCredentials: true,
      auth: { userId },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ connect_error:", err.message);
    });

    socket.on("receive_message", upsertMessage);

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, upsertMessage]);

  /* ---------------- SEND ---------------- */

  const sendMessage = useCallback(
    (message: Partial<Message>) => {
      const socket = socketRef.current;
      if (!socket || !userId || !message.receiverId) return;

      const fullMessage: Message = {
        id: crypto.randomUUID(),
        content: message.content ?? "",
        senderId: userId,
        receiverId: message.receiverId,
        timestamp: new Date().toISOString(),
        status: "sent",
      };

      socket.emit("send_message", fullMessage);
      upsertMessage(fullMessage);
    },
    [userId, upsertMessage]
  );

  const value = useMemo(
    () => ({
      isConnected,
      messages,
      sendMessage,
    }),
    [isConnected, messages, sendMessage]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
