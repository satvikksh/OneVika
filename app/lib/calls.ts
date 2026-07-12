import mongoose from "mongoose";
import { getNativeDb } from "./mongodb";
import { encryptChatText } from "./chatCrypto";

const { ObjectId } = mongoose.Types;

export type StoredCallStatus = "Ringing" | "Missed" | "Rejected" | "Completed" | "Cancelled";
export type StoredCallType = "audio" | "video";

export type CallRecord = {
  _id: mongoose.Types.ObjectId;
  callerId: mongoose.Types.ObjectId;
  receiverIds: mongoose.Types.ObjectId[];
  conversationId?: mongoose.Types.ObjectId;
  roomId: string;
  roomName: string;
  callType: StoredCallType;
  status: StoredCallStatus;
  startedAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
};

type CallUserDoc = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  image?: string;
  avatar?: string;
};

type MongoWriteError = {
  code?: number;
};

export const toObjectId = (id?: string | null) => {
  if (!id || !ObjectId.isValid(id)) return null;
  return new ObjectId(id);
};

export function formatCallDuration(seconds = 0) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

export function buildSystemCallText(callType: StoredCallType, status: StoredCallStatus, durationSeconds = 0) {
  const label = callType === "video" ? "Video Call" : "Audio Call";

  if (status === "Missed") {
    return `Missed ${label}`;
  }

  if (status === "Completed") {
    return `${label} (${formatCallDuration(durationSeconds)})`;
  }

  return `${label} ${status}`;
}

export async function resolveCallConversation({
  callerId,
  receiverIds,
  conversationId,
}: {
  callerId: mongoose.Types.ObjectId;
  receiverIds: mongoose.Types.ObjectId[];
  conversationId?: mongoose.Types.ObjectId | null;
}) {
  const db = await getNativeDb();

  if (conversationId) {
    const conversation = await db.collection("conversations").findOne({
      _id: conversationId,
      participants: callerId,
    });

    if (!conversation?._id) return null;
    return conversation;
  }

  if (receiverIds.length !== 1) return null;

  const receiverId = receiverIds[0];
  let conversation = await db.collection("conversations").findOne({
    participants: { $all: [callerId, receiverId] },
    isGroup: { $ne: true },
  });

  if (!conversation) {
    const now = new Date();
    const result = await db.collection("conversations").insertOne({
      participants: [callerId, receiverId],
      isGroup: false,
      createdAt: now,
      updatedAt: now,
    });

    conversation = {
      _id: result.insertedId,
      participants: [callerId, receiverId],
      isGroup: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  return conversation;
}

export async function insertCallSystemMessage(call: CallRecord) {
  if (!call.conversationId) return null;

  const db = await getNativeDb();
  const now = call.endedAt ?? new Date();
  const text = buildSystemCallText(call.callType, call.status, call.durationSeconds);
  const encrypted = encryptChatText(text);
  const receiverId = call.receiverIds[0] ?? null;

  const result = await db.collection("messages").insertOne({
    conversationId: call.conversationId,
    ...encrypted,
    text,
    senderId: call.callerId,
    receiverId,
    createdAt: now,
    read: false,
    deliveredToUserIds: [call.callerId],
    readByUserIds: [call.callerId],
    starredByUserIds: [],
    hiddenForUserIds: [],
    deletedForUserIds: [],
    type: "system",
    systemType: "call",
    callId: call._id,
    callStatus: call.status,
    callType: call.callType,
    sentAt: now,
  });

  await db.collection("conversations").updateOne(
    { _id: call.conversationId },
    { $set: { updatedAt: now } }
  );

  return {
    id: result.insertedId.toString(),
    conversationId: call.conversationId.toString(),
    text,
    content: text,
    senderId: call.callerId.toString(),
    receiverId: receiverId?.toString?.() ?? "",
    timestamp: now.toISOString(),
    read: false,
    status: "sent",
    type: "system",
    deliveredToUserIds: [call.callerId.toString()],
    readByUserIds: [call.callerId.toString()],
    isStarred: false,
    isHidden: false,
  };
}

export async function createMissedCallNotifications(call: CallRecord) {
  if (!["Missed", "Cancelled"].includes(call.status) || !call._id) return [];

  const db = await getNativeDb();
  const caller = await db.collection<CallUserDoc>("users").findOne(
    { _id: call.callerId },
    { projection: { name: 1, email: 1, image: 1, avatar: 1 } }
  );
  const callerName = caller?.name || caller?.email || "Someone";
  const callLabel = call.callType === "video" ? "Video" : "Audio";
  const now = call.endedAt ?? new Date();
  const receiverIds = Array.from(
    new Map(
      (call.receiverIds || [])
        .filter((receiverId) => receiverId?.toString?.() !== call.callerId.toString())
        .map((receiverId) => [receiverId.toString(), receiverId])
    ).values()
  );

  const notifications = [];

  for (const receiverId of receiverIds) {
    const notification = {
      userId: receiverId,
      senderId: call.callerId,
      type: "call",
      title: "Missed Call",
      message: `Missed ${callLabel} Call from ${callerName}`,
      url: call.conversationId
        ? `/chat?conversationId=${call.conversationId.toString()}`
        : "/chat",
      callId: call._id.toString(),
      conversationId: call.conversationId ?? null,
      callType: call.callType,
      callerName,
      callerAvatar: caller?.image || caller?.avatar || null,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.collection("notifications").insertOne(notification);
      notifications.push({
        ...notification,
        userId: receiverId.toString(),
        senderId: call.callerId.toString(),
        conversationId: call.conversationId?.toString?.() ?? null,
      });
    } catch (error: unknown) {
      if ((error as MongoWriteError)?.code !== 11000) {
        throw error;
      }
    }
  }

  return notifications;
}
