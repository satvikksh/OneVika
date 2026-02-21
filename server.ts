import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import admin from "firebase-admin";
import User from "./app/models/User"; // adjust path if needed

// 🔥 Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// 🔥 Connect MongoDB
mongoose.connect(process.env.MONGO_URI as string).then(() => {
  console.log("MongoDB connected");
});

const app = express();
const httpServer = http.createServer(app);

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

  // 🔥 SEND MESSAGE
  socket.on("send_message", async (message) => {
    try {
      // Send real-time socket message
      io.to(`user_${message.receiverId}`).emit("receive_message", message);
      io.to(`user_${message.senderId}`).emit("receive_message", message);

      // 🔥 SEND PUSH NOTIFICATION
      const receiver = await User.findById(message.receiverId);

      if (receiver?.fcmToken) {
        await admin.messaging().send({
          token: receiver.fcmToken,
          notification: {
            title: "New Message",
            body: message.content,
          },
          webpush: {
            notification: {
              icon: "https://orbitbyte.vercel.app/icons/icon-192.png",
            },
          },
        });

        console.log("Push notification sent");
      }

    } catch (error) {
      console.error("Push Error:", error);
    }
  });

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