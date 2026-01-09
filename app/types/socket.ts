import { Server as NetServer } from "http";
import { NextApiResponse } from "next";
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
  status: string;
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  timestamp: string;
  read: boolean;
  attachments?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
  typing?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- SOCKET SERVER INIT ---------------- */

export function initSocket(res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    return res.socket.server.io;
  }

  const io = new SocketIOServer(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  res.socket.server.io = io;

  /* ---------------- SOCKET EVENTS ---------------- */

  io.on("connection", (socket: Socket) => {
    console.log("🟢 Socket connected:", socket.id);

    /* JOIN CONVERSATION */
    socket.on("join_conversation", (conversationId: string) => {
      if (!conversationId) return;
      socket.join(conversationId);
      console.log(`📥 Joined conversation: ${conversationId}`);
    });

    /* LEAVE CONVERSATION */
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`📤 Left conversation: ${conversationId}`);
    });

    /* SEND MESSAGE */
    socket.on(
      "send_message",
      ({
        conversationId,
        message,
      }: {
        conversationId: string;
        message: Message;
      }) => {
        if (!conversationId || !message) return;

        socket.to(conversationId).emit("receive_message", message);
      }
    );

// export interface SocketDeletePayload {
//   conversationId: string;
//   messageId: string;
// }

    /* TYPING INDICATOR */
    socket.on(
      "typing",
      ({
        conversationId,
        userId,
        isTyping,
      }: {
        conversationId: string;
        userId: string;
        isTyping: boolean;
      }) => {
        socket.to(conversationId).emit("user_typing", {
          userId,
          isTyping,
        });
      }
    );

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });

  return io;
}
