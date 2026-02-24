import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import admin from "firebase-admin";
import User from "./app/models/User.js"; // adjust path if needed

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
      const receiver = await User.findById(message.receiverId).select(
        "fcmToken fcmTokens"
      );

      const tokens = Array.from(
        new Set(
          [
            ...(Array.isArray(receiver?.fcmTokens) ? receiver.fcmTokens : []),
            receiver?.fcmToken,
          ].filter((token): token is string => Boolean(token))
        )
      );

      if (tokens.length > 0) {
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: "New Message",
            body: message.content,
          },
          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              icon: "https://orbitbyte.vercel.app/icons/icon-192.png",
              badge: "https://orbitbyte.vercel.app/icons/icon-192.png",
              tag: `chat_${message.senderId}`,
              renotify: true,
            },
            fcmOptions: {
              link: "https://orbitbyte.vercel.app/chat",
            },
          },
          data: {
            type: "message",
            senderId: String(message.senderId ?? ""),
            receiverId: String(message.receiverId ?? ""),
            url: "/chat",
          },
        });

        const invalidTokens = response.responses
          .map((result, index) => ({ result, token: tokens[index] }))
          .filter(
            ({ result }) =>
              !result.success &&
              (result.error?.code === "messaging/invalid-registration-token" ||
                result.error?.code ===
                  "messaging/registration-token-not-registered")
          )
          .map(({ token }) => token);

        if (invalidTokens.length > 0 && receiver?._id) {
          await User.findByIdAndUpdate(receiver._id, {
            $pull: { fcmTokens: { $in: invalidTokens } },
            ...(invalidTokens.includes(receiver.fcmToken)
              ? { $set: { fcmToken: null } }
              : {}),
          });
        }

        console.log(
          `Push notifications sent: ${response.successCount}/${tokens.length}`
        );
      }
    } catch (error) {
      console.error("Push Error:", error);
    }
  });

  socket.on(
    "sendNotification",
    async ({
      userId: targetUserId,
      data,
    }: {
      userId?: string;
      data?: {
        _id?: string;
        type?: string;
        title?: string;
        message?: string;
        senderId?: string;
        url?: string;
        createdAt?: string | Date;
        isRead?: boolean;
      };
    }) => {
      try {
        if (!targetUserId || !data?.message) return;

        const payload = {
          _id: data._id,
          type: data.type ?? "notification",
          title: data.title,
          message: data.message,
          senderId: data.senderId,
          createdAt: data.createdAt ?? new Date(),
          isRead: data.isRead ?? false,
          url: data.url ?? "/notifications",
        };

        // Realtime event for active sessions
        io.to(`user_${targetUserId}`).emit("receiveNotification", payload);

        // Push notification for inactive app / background / offline cases
        const receiver = await User.findById(targetUserId).select(
          "fcmToken fcmTokens"
        );

        const tokens = Array.from(
          new Set(
            [
              ...(Array.isArray(receiver?.fcmTokens) ? receiver.fcmTokens : []),
              receiver?.fcmToken,
            ].filter((token): token is string => Boolean(token))
          )
        );

        if (tokens.length === 0) return;

        const pushTitle =
          payload.title ||
          (payload.type === "follow"
            ? "New Follower"
            : payload.type === "story"
            ? "New Story"
            : payload.type === "thought"
            ? "New Thought"
            : "New Notification");

        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: pushTitle,
            body: payload.message,
          },
          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              icon: "https://orbitbyte.vercel.app/icons/icon-192.png",
              badge: "https://orbitbyte.vercel.app/icons/icon-192.png",
              tag: `${payload.type}_${payload.senderId ?? "system"}`,
              renotify: true,
            },
            fcmOptions: {
              link: `https://orbitbyte.vercel.app${payload.url ?? "/notifications"}`,
            },
          },
          data: {
            type: String(payload.type ?? "notification"),
            senderId: String(payload.senderId ?? ""),
            receiverId: String(targetUserId),
            url: String(payload.url ?? "/notifications"),
          },
        });

        const invalidTokens = response.responses
          .map((result, index) => ({ result, token: tokens[index] }))
          .filter(
            ({ result }) =>
              !result.success &&
              (result.error?.code === "messaging/invalid-registration-token" ||
                result.error?.code ===
                  "messaging/registration-token-not-registered")
          )
          .map(({ token }) => token);

        if (invalidTokens.length > 0 && receiver?._id) {
          await User.findByIdAndUpdate(receiver._id, {
            $pull: { fcmTokens: { $in: invalidTokens } },
            ...(receiver.fcmToken && invalidTokens.includes(receiver.fcmToken)
              ? { $set: { fcmToken: null } }
              : {}),
          });
        }
      } catch (error) {
        console.error("sendNotification error:", error);
      }
    }
  );

  socket.on(
    "delete_message",
    ({
      messageId,
      senderId,
      receiverId,
    }: {
      messageId?: string;
      senderId?: string;
      receiverId?: string;
    }) => {
      if (!messageId) return;

      if (senderId) {
        io.to(`user_${senderId}`).emit("message_deleted", { messageId });
      }
      if (receiverId) {
        io.to(`user_${receiverId}`).emit("message_deleted", { messageId });
      }

      if (!senderId && !receiverId) {
        io.emit("message_deleted", { messageId });
      }
    }
  );

  socket.on(
    "mark_as_read",
    ({ messageId, userId }: { messageId?: string; userId?: string }) => {
      if (!messageId || !userId) return;

      io.emit("message_read", { messageId, userId });
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
