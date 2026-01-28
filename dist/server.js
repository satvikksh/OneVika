import { createServer } from "http";
import { Server } from "socket.io";
const httpServer = createServer();
const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
        origin: [
            "http://localhost:3000",
            "https://orbitbyte.vercel.app"
        ],
        methods: ["GET", "POST"]
    }
});
io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;
    console.log("✅ Socket connected:", socket.id, "user:", userId);
    socket.join(`user_${userId}`);
    socket.on("send_message", (message) => {
        io.to(`user_${message.receiverId}`).emit("receive_message", message);
    });
});
const PORT = Number(process.env.PORT || 3001);
httpServer.listen(PORT, () => {
    console.log("🚀 Socket server running on", PORT);
});
