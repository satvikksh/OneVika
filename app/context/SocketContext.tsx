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
import { ChatAttachment, Message } from "../types/socket";

type OutgoingMessageInput = Partial<Message> & {
  file?: File | null;
  attachments?: ChatAttachment[];
};

interface SocketContextType {
  isConnected: boolean;
  onlineUsers: string[];
  messages: Message[];
  sendMessage: (message: OutgoingMessageInput) => void;
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

const attachmentsAreEqual = (
  left: ChatAttachment[] = [],
  right: ChatAttachment[] = []
) => {
  if (left.length !== right.length) return false;

  return left.every((attachment, index) => {
    const candidate = right[index];

    return (
      attachment.url === candidate?.url &&
      attachment.type === candidate?.type &&
      attachment.mimeType === candidate?.mimeType &&
      attachment.fileName === candidate?.fileName &&
      attachment.size === candidate?.size &&
      attachment.targetUrl === candidate?.targetUrl &&
      attachment.source === candidate?.source
    );
  });
};

const stringListsAreEqual = (left: string[] = [], right: string[] = []) => {
  if (left.length !== right.length) return false;

  return left.every((value, index) => value === right[index]);
};

const messagesAreEqual = (left: Message, right: Message) =>
  left.id === right.id &&
  left.text === right.text &&
  left.content === right.content &&
  left.senderId === right.senderId &&
  left.receiverId === right.receiverId &&
  left.chatId === right.chatId &&
  left.conversationId === right.conversationId &&
  String(left.timestamp) === String(right.timestamp) &&
  left.read === right.read &&
  left.status === right.status &&
  left.type === right.type &&
  left.replyToId === right.replyToId &&
  left.isStarred === right.isStarred &&
  stringListsAreEqual(left.deliveredToUserIds, right.deliveredToUserIds) &&
  stringListsAreEqual(left.readByUserIds, right.readByUserIds) &&
  attachmentsAreEqual(left.attachments, right.attachments);

const mergeMessageBatch = (
  existingMessages: Message[],
  incomingMessages: Message[]
) => {
  const nextIncoming = incomingMessages.filter((message) => Boolean(message?.id));

  if (nextIncoming.length === 0) {
    return existingMessages;
  }

  const incomingById = new Map<string, Message>();
  nextIncoming.forEach((message) => {
    incomingById.set(message.id, message);
  });

  let didChange = false;

  const mergedMessages = existingMessages.map((message) => {
    const replacement = incomingById.get(message.id);

    if (!replacement) {
      return message;
    }

    incomingById.delete(message.id);

    const mergedMessage = {
      ...message,
      ...replacement,
    };

    if (messagesAreEqual(message, mergedMessage)) {
      return message;
    }

    didChange = true;
    return mergedMessage;
  });

  if (incomingById.size === 0) {
    return didChange ? mergedMessages : existingMessages;
  }

  didChange = true;
  mergedMessages.push(...incomingById.values());

  return mergedMessages;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const socketRef = useRef<Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) => mergeMessageBatch(prev, [msg]));
  }, []);

  const addMessages = useCallback((incomingMessages: Message[]) => {
    setMessages((prev) => mergeMessageBatch(prev, incomingMessages));
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
    (message: OutgoingMessageInput) => {
      const socket = socketRef.current;
      if (!socket || !userId || (!message.receiverId && !message.conversationId)) return;

      const messageText = (message.content ?? "").trim();
      const attachments = Array.isArray(message.attachments)
        ? message.attachments.filter((attachment) => Boolean(attachment?.url))
        : [];
      const pendingFile =
        typeof File !== "undefined" && message.file instanceof File
          ? message.file
          : null;

      if (!messageText && attachments.length === 0 && !pendingFile) return;

      const tempMessage: Message = {
        id: message.id ?? crypto.randomUUID(),
        content: messageText,
        text: messageText,
        senderId: userId,
        receiverId: message.receiverId ?? "",
        chatId: message.chatId ?? message.conversationId,
        conversationId: message.conversationId,
        timestamp: new Date().toISOString(),
        status: "sending",
        type:
          attachments[0]?.type ??
          (pendingFile
            ? pendingFile.type.startsWith("image/")
              ? "image"
              : pendingFile.type.startsWith("video/")
                ? "video"
                : pendingFile.type.startsWith("audio/")
                  ? "audio"
                  : "file"
            : "text"),
        attachments:
          attachments.length > 0
            ? attachments
            : pendingFile
              ? [
                  {
                    url: URL.createObjectURL(pendingFile),
                    type: pendingFile.type.startsWith("image/")
                      ? "image"
                      : pendingFile.type.startsWith("video/")
                        ? "video"
                        : pendingFile.type.startsWith("audio/")
                          ? "audio"
                          : "file",
                    mimeType: pendingFile.type,
                    fileName: pendingFile.name,
                    size: pendingFile.size,
                    source: "upload",
                  } satisfies ChatAttachment,
                ]
              : [],
        replyToId: message.replyToId,
        deliveredToUserIds: [userId],
        readByUserIds: [userId],
        isStarred: false,
      };

      upsertMessage(tempMessage);

      (async () => {
        try {
          let res: Response;

          if (pendingFile) {
            const formData = new FormData();
            if (message.receiverId) {
              formData.append("receiverId", message.receiverId);
            }
            if (message.conversationId) {
              formData.append("conversationId", message.conversationId);
            }
            if (messageText) {
              formData.append("text", messageText);
            }
            if (message.replyToId) {
              formData.append("replyToId", message.replyToId);
            }
            formData.append("file", pendingFile);

            res = await fetch("/api/messages/send", {
              method: "POST",
              body: formData,
            });
          } else {
            res = await fetch("/api/messages/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: messageText,
                receiverId: message.receiverId,
                conversationId: message.conversationId,
                replyToId: message.replyToId,
                attachments,
              }),
            });
          }

          const data = await res.json();
          if (!res.ok || !data?.message) {
            throw new Error(data?.error || "Failed to save message");
          }

          const savedMessage: Message = {
            id: data.message.id,
            content: data.message.text ?? messageText,
            text: data.message.text ?? messageText,
            senderId: data.message.senderId ?? userId,
            receiverId: data.message.receiverId ?? message.receiverId ?? "",
            chatId: data.message.conversationId,
            conversationId: data.message.conversationId ?? message.conversationId,
            timestamp: data.message.timestamp ?? new Date().toISOString(),
            status: data.message.status ?? "sent",
            type: data.message.type ?? tempMessage.type ?? "text",
            attachments: Array.isArray(data.message.attachments)
              ? data.message.attachments
              : [],
            replyToId: data.message.replyToId ?? message.replyToId,
            deliveredToUserIds: Array.isArray(data.message.deliveredToUserIds)
              ? data.message.deliveredToUserIds
              : [userId],
            readByUserIds: Array.isArray(data.message.readByUserIds)
              ? data.message.readByUserIds
              : [userId],
            isStarred: Boolean(data.message.isStarred),
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
        } finally {
          tempMessage.attachments?.forEach((attachment) => {
            if (attachment.url.startsWith("blob:")) {
              URL.revokeObjectURL(attachment.url);
            }
          });
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
            ? {
                ...m,
                read: true,
                status: "read",
                deliveredToUserIds: Array.from(
                  new Set([...(m.deliveredToUserIds ?? []), userId])
                ),
                readByUserIds: Array.from(
                  new Set([...(m.readByUserIds ?? []), userId])
                ),
              }
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

      if (msg.senderId !== userId) {
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
      "message_delivered",
      ({ messageId, userIds }: { messageId: string; userIds?: string[] }) => {
        if (!messageId) return;
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== messageId || message.status === "read") {
              return message;
            }

            const deliveredToUserIds = Array.from(
              new Set([
                ...(message.deliveredToUserIds ?? []),
                ...(Array.isArray(userIds) ? userIds : []),
              ])
            );

            return {
              ...message,
              deliveredToUserIds,
              status: "delivered",
            };
          })
        );
      }
    );

    socket.on(
      "message_read",
      ({ messageId, userId: readByUserId }: { messageId: string; userId: string }) => {
        if (!messageId) return;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  read: true,
                  status: "read",
                  deliveredToUserIds: Array.from(
                    new Set([
                      ...(message.deliveredToUserIds ?? []),
                      ...(readByUserId ? [readByUserId] : []),
                    ])
                  ),
                  readByUserIds: Array.from(
                    new Set([
                      ...(message.readByUserIds ?? []),
                      ...(readByUserId ? [readByUserId] : []),
                    ])
                  ),
                }
              : message
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
      socket.off("message_delivered");
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
      addMessages,
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
      addMessages,
      markMessageAsRead,
    ]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
