import { Server as NetServer } from "http";
import { NextApiResponse } from "next";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { Server as SocketIOServer, Socket } from "socket.io";

/* ---------------- TYPES ---------------- */

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export interface Message {
  id: string;
  text?: string;
  content?: string;
  senderId: string;
  receiverId: string;
  timestamp: string | Date;
  chatId?: string;
  conversationId?: string;
  read?: boolean;
  status?: "sending" | "sent" | "delivered" | "read";
  type?: "text" | "image" | "video" | "audio" | "file";
  attachments?: ChatAttachment[];
  replyToId?: string;
  seenBy?: string[];
  deliveredToUserIds?: string[];
  readByUserIds?: string[];
  isStarred?: boolean;
}

export interface ChatAttachment {
  url: string;
  type: "image" | "video" | "audio" | "file";
  mimeType?: string;
  fileName?: string;
  size?: number;
  targetUrl?: string;
  source?: "feed" | "upload" | "link";
}

export interface User {
  lastSeen?: string | null;
  isOnline?: boolean;
  isPremium?: boolean;
  avatar?: string | StaticImport;
  email?: string | null;
  id: string;
  name?: string;
  image?: string;
  unreadCount?: number;
  lastMessageAt?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isLocked?: boolean;
  lockVisibility?: "blur" | "hidden";
  isUnlocked?: boolean;
  isBlocked?: boolean;
  isBlockedByCurrentUser?: boolean;
  hasBlockedCurrentUser?: boolean;
  canMessage?: boolean;
  chatType?: "direct" | "group";
  conversationId?: string;
  memberIds?: string[];
  memberCount?: number;
  isGroupOwner?: boolean;
  subtitle?: string | null;
}


/* ---------------- SOCKET SERVER INIT ---------------- */

export function initSocket(res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    console.log("ℹ️ Socket.IO already running");
    return res.socket.server.io;
  }

  console.log("🚀 Initializing Socket.IO server...");

  const io = new SocketIOServer(res.socket.server, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? ["https://orbitbyte.vercel.app"]
          : ["http://localhost:3000"],
      credentials: true,
    },
    transports: ["polling"],
  });

  res.socket.server.io = io;

  /* ---------------- ACTIVE USERS MAP ---------------- */
  const activeUsers = new Map<string, Set<string>>();

  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.auth?.userId as string;

    console.log("🟢 Socket connected:", socket.id, "User:", userId);

    if (userId) {
      socket.join(`user_${userId}`);

      if (!activeUsers.has(userId)) {
        activeUsers.set(userId, new Set());
      }
      activeUsers.get(userId)!.add(socket.id);

      io.emit("user_status", { userId, isOnline: true });
    }

  /* ---------------- SEND MESSAGE ---------------- */
socket.join(`user_${userId}`);
  console.log(`👤 joined room: user_${userId}`);

  socket.on("send_message", (message) => {
    console.log("📤 send_message:", message);

    io.to(`user_${message.receiverId}`).emit("receive_message", message);
    io.to(`user_${message.senderId}`).emit("receive_message", message);
  });

/* ---------------- MESSAGE READ ---------------- */
socket.on("mark_as_read", ({ messageId, userId }) => {
  if (!messageId || !userId) return;

  io.emit("message_read", {
    messageId,
    userId,
  });
});

    /* ---------------- DISCONNECT ---------------- */
    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);

      if (userId && activeUsers.has(userId)) {
        activeUsers.get(userId)!.delete(socket.id);
        if (activeUsers.get(userId)!.size === 0) {
          activeUsers.delete(userId);
          io.emit("user_status", { userId, isOnline: false });
        }
      }
    });
  });

  console.log("✅ Socket.IO server initialized");
  return io;
}
/* ---------------- EXPORT TYPES ---------------- */

export { SocketIOServer, Socket };
