import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import admin from "firebase-admin";
import User from "./app/models/User.js";
import Notification from "./app/models/Notification.js";
import { decryptChatText, encryptChatText } from "./app/lib/chatCrypto.js";

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

type ConversationDoc = {
  _id: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  isGroup?: boolean;
  isAI?: boolean;
  aiAssistantUserId?: mongoose.Types.ObjectId;
  name?: string;
};

type SocketMessagePayload = {
  id?: string;
  senderId?: string;
  receiverId?: string;
  conversationId?: string;
  content?: string;
  text?: string;
  timestamp?: string | Date;
  type?: string;
  status?: "sending" | "sent" | "delivered" | "read";
  deliveredToUserIds?: string[];
  readByUserIds?: string[];
  isAI?: boolean;
  isStreaming?: boolean;
};

type StoredMessageDoc = {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId | null;
  text?: string;
  textCipher?: string;
  textIv?: string;
  textTag?: string;
  createdAt?: Date;
  type?: string;
  isAI?: boolean;
  isStreaming?: boolean;
  aiReplyStatus?: "processing" | "completed" | "failed";
};

type DeepSeekChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://orbitbyte.vercel.app";
const PREMIUM_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const BACKGROUND_JOB_INTERVAL_MS = Number(
  process.env.BACKGROUND_JOB_INTERVAL_MS || "300000"
);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = (
  process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
).replace(/\/+$/, "");
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const AI_CONTEXT_MESSAGE_LIMIT = Math.min(
  Math.max(Number(process.env.AI_CONTEXT_MESSAGE_LIMIT || "24"), 4),
  60
);
const AI_RESPONSE_MAX_RETRIES = Math.min(
  Math.max(Number(process.env.AI_RESPONSE_MAX_RETRIES || "2"), 1),
  3
);
const AI_SYSTEM_PROMPT =
  process.env.AI_SYSTEM_PROMPT ||
  [
    "You are Orbit AI, a helpful AI assistant inside the OrbitByte chat app.",
    "Answer clearly, conversationally, and safely.",
    "Use the recent chat history as context, but do not claim access to private data outside this conversation.",
    "If the user asks about OrbitByte features, be practical and developer-friendly.",
  ].join(" ");
const AI_PROVIDER_FAILURE_MESSAGE =
  "I’m connected, but I couldn’t get a response from the AI provider right now. Please try again in a moment.";
const INTERNAL_SOCKET_SECRET =
  process.env.SOCKET_INTERNAL_SECRET || process.env.NEXTAUTH_SECRET || "";

let backgroundJobsStarted = false;
let backgroundJobsRunning = false;
const aiReplyJobs = new Set<string>();

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

app.post("/internal/ai/reply", express.json({ limit: "64kb" }), async (req, res) => {
  try {
    if (
      INTERNAL_SOCKET_SECRET &&
      req.headers.authorization !== `Bearer ${INTERNAL_SOCKET_SECRET}`
    ) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const messageId = req.body?.messageId?.toString?.();
    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      res.status(400).json({ error: "Valid messageId is required" });
      return;
    }

    const messageObjectId = new mongoose.Types.ObjectId(messageId);
    const storedMessage = await mongoose.connection.db
      ?.collection<StoredMessageDoc>("messages")
      .findOne({ _id: messageObjectId });

    if (!storedMessage) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const conversation = (await mongoose.connection.db
      ?.collection<ConversationDoc>("conversations")
      .findOne({ _id: storedMessage.conversationId })) as ConversationDoc | null;

    if (!conversation?.isAI) {
      res.status(204).end();
      return;
    }

    const text = readStoredMessageText(storedMessage);
    void handleAiConversationMessage(conversation, {
      id: storedMessage._id.toString(),
      conversationId: storedMessage.conversationId.toString(),
      senderId: storedMessage.senderId.toString(),
      receiverId: storedMessage.receiverId?.toString?.() ?? "",
      content: text,
      text,
      timestamp: storedMessage.createdAt?.toISOString?.() ?? new Date().toISOString(),
      type: storedMessage.type ?? "text",
      status: "sent",
      isAI: Boolean(storedMessage.isAI),
      isStreaming: Boolean(storedMessage.isStreaming),
    }).catch((error) => {
      console.error("[AI Chat] Internal AI reply trigger failed:", error);
    });

    res.status(202).json({ started: true });
  } catch (error) {
    console.error("[AI Chat] Failed to accept internal AI reply trigger:", error);
    res.status(500).json({ error: "Failed to trigger AI reply" });
  }
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

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const toObjectId = (id?: string | mongoose.Types.ObjectId | null) => {
  const value = id?.toString?.();
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
};

const readStoredMessageText = (message: StoredMessageDoc) => {
  if (message.text?.trim()) {
    return message.text.trim();
  }

  if (message.textCipher && message.textIv && message.textTag) {
    try {
      return decryptChatText({
        textCipher: message.textCipher,
        textIv: message.textIv,
        textTag: message.textTag,
      }).trim();
    } catch (error) {
      console.error("[AI Chat] Failed to decrypt context message:", error);
    }
  }

  return "";
};

async function buildAiContextMessages(
  conversationId: mongoose.Types.ObjectId,
  assistantUserId: mongoose.Types.ObjectId
): Promise<DeepSeekChatMessage[]> {
  const rawMessages = await mongoose.connection.db
    ?.collection<StoredMessageDoc>("messages")
    .find({
      conversationId,
      type: { $ne: "system" },
    })
    .sort({ _id: -1 })
    .limit(AI_CONTEXT_MESSAGE_LIMIT)
    .toArray();

  const contextMessages = (rawMessages || [])
    .reverse()
    .map((message): DeepSeekChatMessage | null => {
      const content = readStoredMessageText(message);
      if (!content) return null;

      return {
        role:
          message.senderId?.toString?.() === assistantUserId.toString()
            ? "assistant"
            : "user",
        content,
      };
    })
    .filter((message): message is DeepSeekChatMessage => Boolean(message));

  return [{ role: "system", content: AI_SYSTEM_PROMPT }, ...contextMessages];
}

function buildAiSocketMessagePayload({
  messageId,
  conversationId,
  assistantUserId,
  humanUserId,
  text,
  createdAt,
  isStreaming,
}: {
  messageId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  assistantUserId: mongoose.Types.ObjectId;
  humanUserId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  isStreaming: boolean;
}): SocketMessagePayload {
  return {
    id: messageId.toString(),
    conversationId: conversationId.toString(),
    senderId: assistantUserId.toString(),
    receiverId: humanUserId.toString(),
    content: text,
    text,
    timestamp: createdAt.toISOString(),
    status: "delivered",
    type: "text",
    deliveredToUserIds: [assistantUserId.toString(), humanUserId.toString()],
    readByUserIds: [assistantUserId.toString()],
    isAI: true,
    isStreaming,
  };
}

function emitAiTypingState({
  humanUserId,
  assistantUserId,
  conversationId,
  isTyping,
}: {
  humanUserId: mongoose.Types.ObjectId;
  assistantUserId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  isTyping: boolean;
}) {
  io.to(`user_${humanUserId.toString()}`).emit(
    isTyping ? "typing_start" : "typing_stop",
    {
      userId: assistantUserId.toString(),
      conversationId: conversationId.toString(),
      isAI: true,
    }
  );
}

function emitAiMessageToHuman(
  humanUserId: mongoose.Types.ObjectId,
  payload: SocketMessagePayload
) {
  io.to(`user_${humanUserId.toString()}`).emit("receive_message", payload);
}

function emitAiErrorToHuman({
  humanUserId,
  conversationId,
  error,
}: {
  humanUserId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  error: unknown;
}) {
  io.to(`user_${humanUserId.toString()}`).emit("ai_response_error", {
    conversationId: conversationId.toString(),
    message:
      error instanceof Error
        ? error.message
        : "The AI response failed for an unknown reason.",
    retryable: true,
  });
}

async function streamDeepSeekReply(
  messages: DeepSeekChatMessage[],
  onDelta: (delta: string, fullText: string) => Promise<void> | void
) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured on the socket server.");
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= AI_RESPONSE_MAX_RETRIES; attempt += 1) {
    let fullText = "";
    let emittedAnyChunk = false;

    try {
      console.info(
        `[AI Chat] Calling DeepSeek (${DEEPSEEK_MODEL}), attempt ${attempt}/${AI_RESPONSE_MAX_RETRIES}`
      );

      const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages,
          thinking: { type: "disabled" },
          stream: true,
        }),
      });

      if (!response.ok) {
        const providerErrorText = await response.text().catch(() => "");
        const error = new Error(
          `DeepSeek API error ${response.status}: ${
            providerErrorText || response.statusText
          }`
        );

        if (
          attempt < AI_RESPONSE_MAX_RETRIES &&
          (response.status === 429 || response.status >= 500)
        ) {
          lastError = error;
          console.warn("[AI Chat] DeepSeek retryable error:", error.message);
          await sleep(500 * attempt);
          continue;
        }

        throw error;
      }

      if (!response.body) {
        throw new Error("DeepSeek API returned an empty streaming response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith("data:")) {
            continue;
          }

          const data = trimmedLine.slice("data:".length).trim();
          if (data === "[DONE]") {
            return fullText;
          }

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{
                delta?: {
                  content?: string | null;
                  reasoning_content?: string | null;
                };
              }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;

            if (typeof delta === "string" && delta.length > 0) {
              emittedAnyChunk = true;
              fullText += delta;
              await onDelta(delta, fullText);
            }
          } catch (error) {
            console.warn("[AI Chat] Ignored malformed DeepSeek SSE chunk:", {
              data,
              error,
            });
          }
        }
      }

      if (buffer.trim()) {
        console.warn("[AI Chat] DeepSeek stream ended with unprocessed data.");
      }

      if (fullText.trim()) {
        return fullText;
      }

      throw new Error("DeepSeek returned an empty assistant response.");
    } catch (error) {
      lastError = error;

      if (emittedAnyChunk) {
        console.error("[AI Chat] Stream interrupted after partial output:", error);
        return `${fullText.trim()}\n\n_Response interrupted. Please try again if you need the rest._`;
      }

      if (attempt < AI_RESPONSE_MAX_RETRIES) {
        console.warn("[AI Chat] Retrying failed AI response:", error);
        await sleep(500 * attempt);
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("DeepSeek response failed.");
}

async function storeAiReply({
  messageId,
  conversationId,
  assistantUserId,
  humanUserId,
  text,
  createdAt,
}: {
  messageId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  assistantUserId: mongoose.Types.ObjectId;
  humanUserId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}) {
  const encrypted = encryptChatText(text);

  await mongoose.connection.db?.collection("messages").insertOne({
    _id: messageId,
    conversationId,
    ...encrypted,
    text,
    senderId: assistantUserId,
    receiverId: humanUserId,
    createdAt,
    read: false,
    deliveredToUserIds: [assistantUserId, humanUserId],
    readByUserIds: [assistantUserId],
    starredByUserIds: [],
    hiddenForUserIds: [],
    deletedForUserIds: [],
    type: "text",
    isAI: true,
    isStreaming: false,
  });

  await mongoose.connection.db?.collection("conversations").updateOne(
    { _id: conversationId },
    {
      $set: {
        updatedAt: createdAt,
        isAI: true,
        aiAssistantUserId: assistantUserId,
      },
    }
  );
}

async function handleAiConversationMessage(
  conversation: ConversationDoc | null,
  humanMessage: SocketMessagePayload
) {
  if (
    !conversation?.isAI ||
    !humanMessage.id ||
    !mongoose.Types.ObjectId.isValid(humanMessage.id) ||
    !humanMessage.senderId
  ) {
    return;
  }

  const conversationId = toObjectId(conversation._id);
  const humanUserId = toObjectId(humanMessage.senderId);
  const assistantUserId =
    toObjectId(conversation.aiAssistantUserId) ||
    (conversation.participants || []).find(
      (participant) => participant?.toString?.() !== humanMessage.senderId
    );
  const assistantObjectId = toObjectId(assistantUserId);

  if (!conversationId || !humanUserId || !assistantObjectId) {
    console.warn("[AI Chat] Missing AI conversation identifiers.", {
      conversationId: conversation._id?.toString?.(),
      senderId: humanMessage.senderId,
      assistantUserId: conversation.aiAssistantUserId?.toString?.(),
    });
    return;
  }

  if (humanUserId.toString() === assistantObjectId.toString()) {
    return;
  }

  const userText = (humanMessage.text || humanMessage.content || "").trim();
  if (!userText) {
    console.info("[AI Chat] Skipping AI reply for non-text/empty message.");
    return;
  }

  const jobKey = humanMessage.id;
  if (aiReplyJobs.has(jobKey)) {
    console.info(`[AI Chat] Duplicate AI job ignored for message ${jobKey}.`);
    return;
  }

  const humanMessageObjectId = new mongoose.Types.ObjectId(humanMessage.id);
  const claimResult = await mongoose.connection.db?.collection("messages").updateOne(
    {
      _id: humanMessageObjectId,
      $or: [
        { aiReplyStatus: { $exists: false } },
        { aiReplyStatus: "failed" },
      ],
    },
    {
      $set: {
        aiReplyStatus: "processing",
        aiReplyStartedAt: new Date(),
      },
      $unset: {
        aiReplyError: "",
      },
    }
  );

  if (!claimResult?.matchedCount) {
    console.info("[AI Chat] AI reply already claimed for message.", {
      messageId: humanMessage.id,
    });
    return;
  }

  aiReplyJobs.add(jobKey);
  const replyMessageId = new mongoose.Types.ObjectId();
  const replyCreatedAt = new Date();
  let finalText = "";

  try {
    console.info("[AI Chat] Starting AI reply job.", {
      conversationId: conversationId.toString(),
      humanMessageId: humanMessage.id,
      humanUserId: humanUserId.toString(),
      assistantUserId: assistantObjectId.toString(),
    });

    await mongoose.connection.db?.collection("messages").updateOne(
      { _id: humanMessageObjectId },
      {
        $addToSet: {
          deliveredToUserIds: assistantObjectId,
          readByUserIds: assistantObjectId,
        },
      }
    );

    io.to(`user_${humanUserId.toString()}`).emit("message_delivered", {
      messageId: humanMessage.id,
      userIds: [assistantObjectId.toString()],
    });
    io.to(`user_${humanUserId.toString()}`).emit("message_read", {
      messageId: humanMessage.id,
      userId: assistantObjectId.toString(),
    });

    emitAiTypingState({
      humanUserId,
      assistantUserId: assistantObjectId,
      conversationId,
      isTyping: true,
    });

    const contextMessages = await buildAiContextMessages(
      conversationId,
      assistantObjectId
    );

    finalText = await streamDeepSeekReply(
      contextMessages,
      async (_delta, fullText) => {
        finalText = fullText;
        emitAiMessageToHuman(
          humanUserId,
          buildAiSocketMessagePayload({
            messageId: replyMessageId,
            conversationId,
            assistantUserId: assistantObjectId,
            humanUserId,
            text: fullText,
            createdAt: replyCreatedAt,
            isStreaming: true,
          })
        );
      }
    );

    finalText = finalText.trim() || AI_PROVIDER_FAILURE_MESSAGE;
  } catch (error) {
    console.error("[AI Chat] AI reply failed:", error);
    emitAiErrorToHuman({ humanUserId, conversationId, error });
    finalText = finalText.trim() || AI_PROVIDER_FAILURE_MESSAGE;
  } finally {
    emitAiTypingState({
      humanUserId,
      assistantUserId: assistantObjectId,
      conversationId,
      isTyping: false,
    });
  }

  try {
    await storeAiReply({
      messageId: replyMessageId,
      conversationId,
      assistantUserId: assistantObjectId,
      humanUserId,
      text: finalText,
      createdAt: replyCreatedAt,
    });

    await mongoose.connection.db?.collection("messages").updateOne(
      { _id: humanMessageObjectId },
      {
        $set: {
          aiReplyStatus: "completed",
          aiReplyCompletedAt: new Date(),
          aiReplyMessageId: replyMessageId,
        },
      }
    );

    emitAiMessageToHuman(
      humanUserId,
      buildAiSocketMessagePayload({
        messageId: replyMessageId,
        conversationId,
        assistantUserId: assistantObjectId,
        humanUserId,
        text: finalText,
        createdAt: replyCreatedAt,
        isStreaming: false,
      })
    );

    console.info("[AI Chat] AI reply stored and emitted.", {
      conversationId: conversationId.toString(),
      replyMessageId: replyMessageId.toString(),
    });
  } catch (error) {
    console.error("[AI Chat] Failed to store/emit AI reply:", error);
    await mongoose.connection.db?.collection("messages").updateOne(
      { _id: humanMessageObjectId },
      {
        $set: {
          aiReplyStatus: "failed",
          aiReplyError: error instanceof Error ? error.message : "Unknown error",
        },
      }
    );
    emitAiErrorToHuman({ humanUserId, conversationId, error });
  } finally {
    aiReplyJobs.delete(jobKey);
  }
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

  socket.on("send_message", async (message: SocketMessagePayload) => {
    try {
      if (!message.senderId) {
        return;
      }

      if (handshakeUserId && message.senderId !== handshakeUserId) {
        console.warn("[Socket] Ignored message with mismatched sender.", {
          socketId: socket.id,
          handshakeUserId,
          senderId: message.senderId,
        });
        return;
      }

      const conversationId =
        message.conversationId && mongoose.Types.ObjectId.isValid(message.conversationId)
          ? new mongoose.Types.ObjectId(message.conversationId)
          : null;

      const conversation = conversationId
        ? ((await mongoose.connection.db
            ?.collection<ConversationDoc>("conversations")
            .findOne({ _id: conversationId })) as ConversationDoc | null)
        : null;

      const recipientIds = conversation
        ? (conversation.participants || [])
            .map((participant) => participant?.toString?.())
            .filter(
              (participantId): participantId is string =>
                Boolean(participantId) && participantId !== message.senderId
            )
        : message.receiverId
          ? [message.receiverId]
          : [];

      const audienceIds = Array.from(
        new Set([message.senderId, ...recipientIds].filter(Boolean))
      );

      audienceIds.forEach((audienceUserId) => {
        io.to(`user_${audienceUserId}`).emit("receive_message", message);
      });

      const deliveredUserIds = recipientIds.filter((recipientId) =>
        Boolean(activeUsers.get(recipientId)?.size)
      );

      if (
        deliveredUserIds.length > 0 &&
        message.id &&
        mongoose.Types.ObjectId.isValid(message.id)
      ) {
        await mongoose.connection.db?.collection("messages").updateOne(
          { _id: new mongoose.Types.ObjectId(message.id) },
          {
            $addToSet: {
              deliveredToUserIds: {
                $each: deliveredUserIds.map(
                  (recipientId) => new mongoose.Types.ObjectId(recipientId)
                ),
              },
            },
          }
        );

        const deliveredPayload = {
          messageId: message.id,
          userIds: deliveredUserIds,
        };

        io.to(`user_${message.senderId}`).emit(
          "message_delivered",
          deliveredPayload
        );
      }

      const notificationRecipientIds = conversation?.isAI
        ? recipientIds.filter(
            (recipientId) =>
              recipientId !== conversation.aiAssistantUserId?.toString?.()
          )
        : recipientIds;

      await Promise.all(
        notificationRecipientIds.map((recipientId) =>
          pushNotificationToUser(recipientId, {
            type: "message",
            title: "New Message",
            message:
              message.content || message.text || "You received a new message.",
            senderId: message.senderId,
            url: "/chat",
          }).catch((error) => {
            console.error("Push Error:", error);
          })
        )
      );

      if (conversation?.isAI) {
        void handleAiConversationMessage(conversation, message).catch((error) => {
          console.error("[AI Chat] Unhandled AI reply job error:", error);
        });
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

      if (
        mongoose.Types.ObjectId.isValid(messageId) &&
        mongoose.Types.ObjectId.isValid(userId)
      ) {
        void mongoose.connection.db
          ?.collection("messages")
          .updateOne(
            { _id: new mongoose.Types.ObjectId(messageId) },
            {
              $addToSet: {
                deliveredToUserIds: new mongoose.Types.ObjectId(userId),
                readByUserIds: new mongoose.Types.ObjectId(userId),
              },
            }
          )
          .catch((error) => {
            console.error("MESSAGE READ UPDATE ERROR:", error);
          });
      }

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
