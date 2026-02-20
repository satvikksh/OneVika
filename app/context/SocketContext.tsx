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

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: string | Date;
  read?: boolean;
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
  removeMessage: (messageId: string) => void;
  emitMessageDelete: (payload: {
    messageId: string;
    senderId: string;
    receiverId: string;
  }) => void;
  addMessages: (messages: Message[]) => void;
  markMessageAsRead: (messageId: string) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  clearMessages: () => void;
  markChatMessagesSeen: (chatId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  onlineUsers: [],
  messages: [],
  sendMessage: () => {},
  removeMessage: () => {},
  emitMessageDelete: () => {},
  addMessages: () => {},
  markMessageAsRead: () => {},
  joinChat: () => {},
  leaveChat: () => {},
  clearMessages: () => {},
  markChatMessagesSeen: () => {},
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const socketRef = useRef<Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === msg.id);
      return exists ? prev.map((m) => (m.id === msg.id ? msg : m)) : [...prev, msg];
    });
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const emitMessageDelete = useCallback(
    (payload: { messageId: string; senderId: string; receiverId: string }) => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.emit("delete_message", payload);
    },
    []
  );

  const sendMessage = useCallback(
    (message: Partial<Message>) => {
      const socket = socketRef.current;
      if (!socket || !userId || !message.receiverId) return;

      const messageText = (message.content ?? "").trim();
      if (!messageText) return;

      const tempMessage: Message = {
        id: message.id ?? crypto.randomUUID(),
        content: messageText,
        senderId: userId,
        receiverId: message.receiverId,
        chatId: message.chatId,
        timestamp: new Date().toISOString(),
        status: "sending",
        type: "text",
      };

      upsertMessage(tempMessage);

      (async () => {
        try {
          const res = await fetch("/api/messages/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: messageText,
              receiverId: message.receiverId,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data?.message) {
            throw new Error(data?.error || "Failed to save message");
          }

          const savedMessage: Message = {
            id: data.message.id,
            content: data.message.text ?? messageText,
            senderId: data.message.senderId ?? userId,
            receiverId: data.message.receiverId ?? message.receiverId,
            chatId: data.message.conversationId,
            timestamp: data.message.timestamp ?? new Date().toISOString(),
            status: "sent",
            type: "text",
          };

          // Replace optimistic temp message with saved DB message
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== tempMessage.id);
            const existsSaved = withoutTemp.some((m) => m.id === savedMessage.id);
            return existsSaved
              ? withoutTemp.map((m) => (m.id === savedMessage.id ? savedMessage : m))
              : [...withoutTemp, savedMessage];
          });

          socket.emit("send_message", savedMessage);
        } catch (error) {
          console.error("Failed to persist message:", error);
          // Remove optimistic message if persistence fails
          removeMessage(tempMessage.id);
        }
      })();
    },
    [userId, upsertMessage, removeMessage]
  );

  const markMessageAsRead = useCallback(
    (messageId: string) => {
      if (!messageId || !userId) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, read: true, status: "read" }
            : m
        )
      );

      const socket = socketRef.current;
      if (!socket) return;

      socket.emit("mark_as_read", { messageId, userId });
    },
    [userId]
  );

  useEffect(() => {
    if (!userId || socketRef.current) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://127.0.0.1:3001";
    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { userId },
    });

    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
    });
    socket.on("online_users", (ids: string[]) => {
      setOnlineUsers(Array.isArray(ids) ? ids : []);
    });
    socket.on(
      "user_status",
      ({ userId: changedUserId, isOnline }: { userId: string; isOnline: boolean }) => {
        if (!changedUserId) return;
        setOnlineUsers((prev) => {
          if (isOnline) {
            return prev.includes(changedUserId) ? prev : [...prev, changedUserId];
          }
          return prev.filter((id) => id !== changedUserId);
        });
      }
    );

    return () => {
      socket.off("online_users");
      socket.off("user_status");
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [userId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("receive_message", (msg: Message) => {
      upsertMessage(msg);

      if (msg.receiverId === userId) {
        window.dispatchEvent(
          new CustomEvent("orbitbyte:newMessageNotification", {
            detail: msg,
          })
        );
      }
    });

    socket.on("message_sent", (msg: Message) => {
      upsertMessage(msg);
    });

    socket.on(
      "message_read",
      ({ messageId }: { messageId: string }) => {
        if (!messageId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, read: true, status: "read" }
              : m
          )
        );
      }
    );

    socket.on("message_deleted", ({ messageId }: { messageId: string }) => {
      if (!messageId) return;
      removeMessage(messageId);
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_sent");
      socket.off("message_read");
      socket.off("message_deleted");
    };
  }, [upsertMessage, userId, removeMessage]);

  const value = useMemo(
    () => ({
      isConnected,
      onlineUsers,
      messages,
      sendMessage,
      removeMessage,
      emitMessageDelete,
      addMessages: (msgs: Message[]) => msgs.forEach(upsertMessage),
      markMessageAsRead,
      joinChat: () => {},
      leaveChat: () => {},
      clearMessages: () => setMessages([]),
      markChatMessagesSeen: () => {},
    }),
    [
      isConnected,
      onlineUsers,
      messages,
      sendMessage,
      removeMessage,
      emitMessageDelete,
      markMessageAsRead,
      upsertMessage,
    ]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
