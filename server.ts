import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import admin from "firebase-admin";
import User from "./app/models/User.js";
import Notification from "./app/models/Notification.js";

type NotificationPayload = {
  _id?: string;
  type?: string;
  title?: string;
  message: string;
  senderId?: string;
  url?: string;
  createdAt?: string | Date;
  isRead?: boolean;
};

type PushTargetUser = {
  _id?: mongoose.Types.ObjectId;
  fcmToken?: string | null;
  fcmTokens?: string[] | null;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://orbitbyte.vercel.app";
const PREMIUM_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const BACKGROUND_JOB_INTERVAL_MS = Number(
  process.env.BACKGROUND_JOB_INTERVAL_MS || "300000"
);

let backgroundJobsStarted = false;
let backgroundJobsRunning = false;

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGO_URI or MONGODB_URI is required");
}

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

const addSocketToActiveUser = (userId: string, socketId: string) => {
  const existingSockets = activeUsers.get(userId);
  const wasOffline = !existingSockets || existingSockets.size === 0;

  if (!existingSockets) {
    activeUsers.set(userId, new Set([socketId]));
  } else {
    existingSockets.add(socketId);
  }

  if (wasOffline) {
    io.emit("user_status", { userId, isOnline: true });
  }

  io.emit("online_users", Array.from(activeUsers.keys()));
};

const removeSocketFromActiveUser = (userId: string, socketId: string) => {
  const userSockets = activeUsers.get(userId);
  if (!userSockets) return;

  userSockets.delete(socketId);

  if (userSockets.size === 0) {
    activeUsers.delete(userId);
    io.emit("user_status", { userId, isOnline: false });
  }

  io.emit("online_users", Array.from(activeUsers.keys()));
};

const collectPushTokens = (user: PushTargetUser | null) =>
  Array.from(
    new Set(
      [
        ...(Array.isArray(user?.fcmTokens) ? user.fcmTokens : []),
        user?.fcmToken,
      ].filter((token): token is string => Boolean(token))
    )
  );

async function pushNotificationToUser(
  targetUserId: string,
  payload: NotificationPayload
) {
  const receiver = (await User.findById(targetUserId).select(
    "fcmToken fcmTokens"
  )) as PushTargetUser | null;

  const tokens = collectPushTokens(receiver);
  if (tokens.length === 0) {
    return;
  }

  const pushTitle =
    payload.title ||
    (payload.type === "follow"
      ? "New Follower"
      : payload.type === "story"
      ? "New Story"
      : payload.type === "thought"
      ? "New Thought"
      : payload.type === "premium"
      ? "Premium Reminder"
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
        icon: `${APP_URL}/icons/icon-192.png`,
        badge: `${APP_URL}/icons/icon-192.png`,
        tag: `${payload.type ?? "notification"}_${payload.senderId ?? "system"}`,
        renotify: true,
      },
      fcmOptions: {
        link: `${APP_URL}${payload.url ?? "/notifications"}`,
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
          result.error?.code === "messaging/registration-token-not-registered")
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
}

async function dispatchNotification(
  targetUserId: string,
  payload: NotificationPayload
) {
  io.to(`user_${targetUserId}`).emit("receiveNotification", payload);
  await pushNotificationToUser(targetUserId, payload);
}

async function markExpiredPremiumInactive() {
  const result = await User.updateMany(
    {
      isPremium: true,
      premiumExpiresAt: { $lte: new Date() },
    },
    {
      $set: { isPremium: false },
      $unset: {
        premiumExpiryReminderFor: 1,
        premiumExpiryReminderSentAt: 1,
      },
    }
  );

  if ((result.modifiedCount ?? 0) > 0) {
    console.log(
      `Premium status cleared for ${result.modifiedCount} expired account(s)`
    );
  }
}

async function claimNextPremiumReminderCandidate() {
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + PREMIUM_REMINDER_WINDOW_MS);

  return User.findOneAndUpdate(
    {
      isPremium: true,
      premiumExpiresAt: { $gt: now, $lte: reminderCutoff },
      $or: [
        { premiumExpiryReminderFor: { $exists: false } },
        { premiumExpiryReminderFor: null },
        { $expr: { $ne: ["$premiumExpiryReminderFor", "$premiumExpiresAt"] } },
      ],
    },
    [
      {
        $set: {
          premiumExpiryReminderFor: "$premiumExpiresAt",
          premiumExpiryReminderSentAt: now,
        },
      },
    ],
    {
      new: true,
      sort: { premiumExpiresAt: 1 },
      lean: true,
    }
  );
}

async function sendPremiumRenewalReminders() {
  let processed = 0;

  while (processed < 25) {
    const user = await claimNextPremiumReminderCandidate();
    if (!user?._id || !user.premiumExpiresAt) {
      break;
    }

    const userId = user._id.toString();
    const reminderUrl = `/profile/${userId}#premium-membership`;
    const reminderMessage =
      "OrbitByte Premium ends in less than 24 hours. Renew now to keep your benefits active.";

    try {
      const notification = await Notification.create({
        userId: user._id,
        type: "premium",
        title: "Premium renewal reminder",
        message: reminderMessage,
        url: reminderUrl,
      });

      await dispatchNotification(userId, {
        _id: notification._id.toString(),
        type: "premium",
        title: notification.title || "Premium renewal reminder",
        message: notification.message,
        url: notification.url || reminderUrl,
        createdAt: notification.createdAt,
        isRead: false,
      });

      processed += 1;
    } catch (error) {
      console.error("Premium reminder error:", error);

      await User.updateOne(
        {
          _id: user._id,
          premiumExpiryReminderFor: user.premiumExpiresAt,
        },
        {
          $set: {
            premiumExpiryReminderFor: null,
            premiumExpiryReminderSentAt: null,
          },
        }
      );
    }
  }

  if (processed > 0) {
    console.log(`Sent ${processed} premium renewal reminder(s)`);
  }
}

async function runBackgroundJobs() {
  if (backgroundJobsRunning) {
    return;
  }

  backgroundJobsRunning = true;

  try {
    await markExpiredPremiumInactive();
    await sendPremiumRenewalReminders();
  } catch (error) {
    console.error("Background job error:", error);
  } finally {
    backgroundJobsRunning = false;
  }
}

function startBackgroundJobs() {
  if (backgroundJobsStarted) {
    return;
  }

  backgroundJobsStarted = true;
  void runBackgroundJobs();
  setInterval(() => {
    void runBackgroundJobs();
  }, BACKGROUND_JOB_INTERVAL_MS);
}

mongoose.connect(mongoUri).then(() => {
  console.log("MongoDB connected");
  startBackgroundJobs();
});

io.on("connection", (socket) => {
  const socketUserIds = new Set<string>();

  const registerSocketUser = (candidateUserId?: string | null) => {
    const resolvedUserId = candidateUserId?.toString().trim();
    if (!resolvedUserId) {
      return;
    }

    socket.join(`user_${resolvedUserId}`);
    socketUserIds.add(resolvedUserId);
    addSocketToActiveUser(resolvedUserId, socket.id);
  };

  const handshakeUserId = socket.handshake.auth?.userId as string | undefined;

  console.log("Socket connected:", socket.id, "user:", handshakeUserId);
  registerSocketUser(handshakeUserId);

  socket.on("join", (joinedUserId?: string) => {
    registerSocketUser(joinedUserId);
  });

  socket.on("send_message", async (message) => {
    try {
      io.to(`user_${message.receiverId}`).emit("receive_message", message);
      io.to(`user_${message.senderId}`).emit("receive_message", message);

      const receiver = (await User.findById(message.receiverId).select(
        "fcmToken fcmTokens"
      )) as PushTargetUser | null;

      const tokens = collectPushTokens(receiver);

      if (tokens.length > 0) {
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: "New Message",
            body: message.content || "You received a new message.",
          },
          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              icon: `${APP_URL}/icons/icon-192.png`,
              badge: `${APP_URL}/icons/icon-192.png`,
              tag: `chat_${message.senderId}`,
              renotify: true,
            },
            fcmOptions: {
              link: `${APP_URL}/chat`,
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
            ...(invalidTokens.includes(receiver.fcmToken || "")
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
      data?: NotificationPayload;
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

        await dispatchNotification(targetUserId, payload);
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

    socketUserIds.forEach((joinedUserId) => {
      removeSocketFromActiveUser(joinedUserId, socket.id);
    });
  });
});

const PORT = Number(process.env.PORT || 3001);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server running on port ${PORT}`);
});
