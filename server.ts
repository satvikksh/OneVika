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
    origin: [
      "http://localhost:3000",
      "https://onevika.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId;

  console.log("✅ Socket connected:", socket.id, "user:", userId);

  if (userId) {
    socket.join(`user_${userId}`);
  }

  socket.on("send_message", (message) => {
    io.to(`user_${message.receiverId}`).emit("receive_message", message);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

const PORT = Number(process.env.PORT || 3001);

// 🚨 THIS LINE FIXES RAILWAY
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Socket server running on port ${PORT}`);
});
