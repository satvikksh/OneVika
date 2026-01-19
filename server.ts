import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: [
      "http://localhost:3000",
      "https://onevika-production.up.railway.app",
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId;

  if (!userId) {
    console.log("❌ Missing userId → disconnect");
    socket.disconnect();
    return;
  }

  const room = `user_${userId}`;
  socket.join(room);

  console.log("👤 Joined room:", room);

  // 🔹 SEND MESSAGE
  socket.on("send_message", (message) => {
    console.log("📨 SERVER received:", message);

    const receiverRoom = `user_${message.receiverId}`;

    console.log("➡️ Emitting to:", receiverRoom);

    io.to(receiverRoom).emit("receive_message", message);

    socket.emit("message_sent", message);
  });
});

httpServer.listen(3001, () => {
  console.log("🚀 Socket server running on 3001");
});
