import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

// ✅ Root route (Railway needs this)
app.get("/", (_req, res) => {
  res.status(200).send("Socket server running 🚀");
});

// ✅ Create HTTP server
const httpServer = createServer(app);

// ✅ Socket.IO
const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: [
      "http://localhost:3000",
      "https://onevika.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
  transports: ["websocket"], // IMPORTANT for production
});

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId;

  if (!userId) {
    console.log("❌ Missing userId, disconnecting");
    socket.disconnect();
    return;
  }

  const room = `user_${userId}`;
  socket.join(room);

  console.log("👤 Joined room:", room);

  socket.on("send_message", (message) => {
    console.log("📨 SERVER received:", message);

    io.to(`user_${message.receiverId}`).emit(
      "receive_message",
      message
    );

    socket.emit("message_sent", message);
  });
});

// ✅ CRITICAL: must use Railway PORT
const PORT = Number(process.env.PORT);

if (!PORT) {
  console.error("❌ PORT is not defined");
  process.exit(1);
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Socket server running on port", PORT);
});
