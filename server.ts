import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Socket server is running 🚀");
    return;
  }

  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: [
      "http://localhost:3000",
      "https://onevika.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
  transports: ["websocket"], // IMPORTANT for Vercel
});

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId;
  if (!userId) return socket.disconnect();

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

const PORT = Number(process.env.PORT) || 3001;

httpServer.listen(PORT, () => {
  console.log("🚀 Socket server running on", PORT);
});
