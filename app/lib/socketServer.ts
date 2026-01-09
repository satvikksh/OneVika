import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: IOServer | null = null;

export function initSocketServer(server: HTTPServer) {
  if (io) return io;

  io = new IOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("join_conversation", (conversationId: string) => {
      socket.join(conversationId);
    });

    socket.on("send_message", (payload) => {
      socket.to(payload.conversationId).emit("receive_message", payload.message);
    });

    socket.on("message_deleted", (payload) => {
      socket.to(payload.conversationId).emit("message_deleted", payload);
    });

    socket.on("mark_seen", (payload) => {
      socket.to(payload.conversationId).emit("message_seen", payload);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  seenBy: string[];
}
export interface SocketMessagePayload {
  conversationId: string;
  message: Message;
}
export interface SocketSeenPayload {
  conversationId: string;
  messageId: string;
  userId: string;
}
