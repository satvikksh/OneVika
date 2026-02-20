import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = http.createServer(app);

// Health check (REQUIRED)
app.get("/", (_req, res) => {
  res.status(200).send("Socket server running");
});

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: ["http://localhost:3000", "https://orbitbyte.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const activeUsers = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId;

  console.log("Socket connected:", socket.id, "user:", userId);

  if (userId) {
    socket.join(`user_${userId}`);
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId)?.add(socket.id);
    io.emit("user_status", { userId, isOnline: true });
    io.emit("online_users", Array.from(activeUsers.keys()));
  }

  socket.on("join", (joinUserId: string) => {
    if (typeof joinUserId === "string" && joinUserId.trim()) {
      socket.join(`user_${joinUserId}`);
    }
  });

  socket.on("send_message", (message) => {
    io.to(`user_${message.receiverId}`).emit("receive_message", message);
    io.to(`user_${message.senderId}`).emit("receive_message", message);
  });

  socket.on(
    "mark_as_read",
    ({ messageId, userId: readerId }: { messageId: string; userId: string }) => {
      if (!messageId || !readerId) return;
      io.emit("message_read", { messageId, userId: readerId });
    }
  );

  socket.on(
    "delete_message",
    ({
      messageId,
      senderId,
      receiverId,
    }: {
      messageId: string;
      senderId: string;
      receiverId: string;
    }) => {
      if (!messageId || !senderId || !receiverId) return;
      io.to(`user_${senderId}`).emit("message_deleted", { messageId });
      io.to(`user_${receiverId}`).emit("message_deleted", { messageId });
    }
  );

  socket.on(
    "sendNotification",
    ({ userId: targetUserId, data }: { userId: string; data: any }) => {
      if (!targetUserId || !data) return;
      io.to(`user_${targetUserId}`).emit("receiveNotification", data);
    }
  );

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    if (userId && activeUsers.has(userId)) {
      const userSockets = activeUsers.get(userId);
      userSockets?.delete(socket.id);
      if (!userSockets || userSockets.size === 0) {
        activeUsers.delete(userId);
        io.emit("user_status", { userId, isOnline: false });
      }
      io.emit("online_users", Array.from(activeUsers.keys()));
    }
  });
});

const PORT = Number(process.env.PORT || 3001);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server running on port ${PORT}`);
});
