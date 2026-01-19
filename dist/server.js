import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    path: "/socket.io",
    transports: ["polling", "websocket"],
    cors: {
        origin: [
            "http://localhost:3000",
            "https://onevika.vercel.app",
        ],
        methods: ["GET", "POST"],
        credentials: false,
    },
});
io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;
    console.log("✅ Socket connected:", socket.id, "user:", userId);
    if (userId) {
        socket.join(`user_${userId}`);
        console.log(`👤 Joined room user_${userId}`);
    }
    socket.on("send_message", (msg) => {
        io.to(`user_${msg.receiverId}`).emit("receive_message", msg);
    });
});
httpServer.listen(3001, () => {
    console.log("🚀 Socket server running on 3001");
});
