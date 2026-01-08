import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: IOServer | null = null;

export function initSocket(server: HTTPServer) {
  if (io) return io;

  io = new IOServer(server, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("join_user", (userId: string) => {
      socket.join(userId);
    });

    socket.on("join_conversation", (conversationId: string) => {
      socket.join(conversationId);
    });

    socket.on("send_message", ({ message }) => {
      // chat message
      socket.to(message.conversationId).emit("receive_message", message);

      // 🔔 REAL-TIME NAVBAR NOTIFICATION
      io?.to(message.receiverId).emit("new_notification", {
        message,
      });
    });

    socket.on("mark_seen", ({ messageIds, conversationId }) => {
      socket.to(conversationId).emit("messages_seen", messageIds);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });

  return io;
}
