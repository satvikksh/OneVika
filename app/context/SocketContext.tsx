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
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
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
  seenBy?: string[];
}

interface SocketContextType {
  isConnected: boolean;
  onlineUsers: string[];
  messages: Message[];
  sendMessage: (message: Partial<Message>) => void;
  addMessages: (messages: Message[]) => void;
  markMessageAsRead: (messageId: string) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  clearMessages: () => void;
  markChatMessagesSeen: (chatId: string) => void;
}

/* ---------------- CONTEXT ---------------- */

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  onlineUsers: [],
  messages: [],
  sendMessage: () => {},
  addMessages: () => {},
  markMessageAsRead: () => {},
  joinChat: () => {},
  leaveChat: () => {},
  clearMessages: () => {},
  markChatMessagesSeen: () => {},
});

/* ---------------- PROVIDER ---------------- */

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const socketRef = useRef<Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  /* ---------------- HELPERS ---------------- */

  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === msg.id);
      return exists
        ? prev.map((m) => (m.id === msg.id ? msg : m))
        : [...prev, msg];
    });
  }, []);

  /* ---------------- SEND MESSAGE ---------------- */

  const sendMessage = useCallback(
    (message: Partial<Message>) => {
      const socket = socketRef.current;
      if (!socket || !userId || !message.receiverId) return;

      const fullMessage: Message = {
        id: message.id ?? crypto.randomUUID(),
        content: message.content ?? "",
        senderId: userId,
        receiverId: message.receiverId,
        chatId: message.chatId,
        timestamp: new Date().toISOString(),
        status: "sent",
        type: "text",
      };

      socket.emit("send_message", fullMessage);

      // ✅ optimistic update for sender
      upsertMessage(fullMessage);
    },
    [userId, upsertMessage]
  );

  /* ---------------- CONNECTION ---------------- */

  useEffect(() => {
    if (!userId || socketRef.current) return;

  const SOCKET_URL =
   "http://127.0.0.1:3001";


    console.log("🔥 Connecting socket:", SOCKET_URL, "user:", userId);

    const socket = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["polling", "websocket"], // ✅ important
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [userId]);

  /* ---------------- RECEIVE MESSAGE ---------------- */

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("receive_message", (msg: Message) => {
      console.log("📥 receive_message:", msg);
      upsertMessage(msg);
    });

    socket.on("message_sent", (msg: Message) => {
      upsertMessage(msg);
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_sent");
    };
  }, [upsertMessage]);

  /* ---------------- CONTEXT VALUE ---------------- */

  const value = useMemo(
    () => ({
      isConnected,
      onlineUsers,
      messages,
      sendMessage,
      addMessages: (msgs: Message[]) => msgs.forEach(upsertMessage),
      markMessageAsRead: () => {},
      joinChat: () => {},
      leaveChat: () => {},
      clearMessages: () => setMessages([]),
      markChatMessagesSeen: () => {},
    }),
    [isConnected, onlineUsers, messages, sendMessage, upsertMessage]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
