import { randomUUID } from "crypto";
import mongoose from "mongoose";
import type { Session } from "next-auth";

import { getNativeDb } from "@/app/lib/mongodb";
import { encryptChatText } from "@/app/lib/chatCrypto";
import Call from "@/app/models/Call";
import { createCallToken } from "@/app/lib/token.service";
import { ensureRoom, getLiveKitPublicUrl } from "@/app/lib/livekit.service";
import type {
  CallCreateResponse,
  CallHistoryItem,
  CallPeer,
  CallTokenResponse,
  CallType,
} from "@/app/types/call";

const { ObjectId } = mongoose.Types;

export interface ControllerResult<T> {
  status: number;
  data: T | { error: string; code?: string };
}

type ConversationDoc = {
  _id: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  isGroup?: boolean;
  isAI?: boolean;
  name?: string;
};

type UserLite = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  avatar?: string;
  image?: string;
  isAI?: boolean;
};

const err = (status: number, error: string, code?: string): ControllerResult<never> => ({
  status,
  data: { error, ...(code ? { code } : {}) },
});

const toPeer = (user: UserLite | null | undefined): CallPeer | null => {
  if (!user?._id) return null;
  return {
    id: user._id.toString(),
    name: user.name || user.email || "Member",
    avatar: user.avatar || user.image || null,
  };
};

const normalizeCallType = (value: unknown): CallType =>
  value === "video" ? "video" : "audio";

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function buildSystemMessageText(
  callType: CallType,
  status: string,
  durationSeconds: number
): string {
  const icon = callType === "video" ? "\u{1F4F9}" : "\u{1F4DE}";
  const label = callType === "video" ? "Video call" : "Audio call";

  switch (status) {
    case "completed":
      return `${icon} ${label} \u00B7 ${formatDuration(durationSeconds)}`;
    case "missed":
      return `\u{1F4F5} Missed ${callType} call`;
    case "rejected":
      return `\u{1F4F5} ${label} declined`;
    case "cancelled":
      return `\u{1F4F5} ${callType === "video" ? "Video" : "Audio"} call cancelled`;
    case "busy":
      return `\u{1F4F5} ${label} \u2014 line busy`;
    default:
      return `${icon} ${label}`;
  }
}

/** POST /api/calls/create */
export async function createCall(
  session: Session | null,
  body: {
    receiverId?: string;
    conversationId?: string;
    callType?: CallType;
    isGroup?: boolean;
  }
): Promise<ControllerResult<CallCreateResponse>> {
  if (!session?.user?.id) {
    return err(401, "Unauthorized");
  }

  const callerId = session.user.id;
  if (!ObjectId.isValid(callerId)) {
    return err(400, "Invalid caller id");
  }

  const callType = normalizeCallType(body.callType);
  const isGroup = Boolean(body.isGroup);
  const db = await getNativeDb();
  const callerObjectId = new ObjectId(callerId);

  const caller = (await db.collection("users").findOne(
    { _id: callerObjectId },
    { projection: { name: 1, email: 1, avatar: 1, image: 1 } }
  )) as UserLite | null;

  let conversation: ConversationDoc | null = null;
  let receiverObjectId: mongoose.Types.ObjectId | null = null;
  let memberIds: string[] = [];

  if (isGroup) {
    if (!body.conversationId || !ObjectId.isValid(body.conversationId)) {
      return err(400, "A valid group conversation id is required");
    }

    conversation = (await db.collection<ConversationDoc>("conversations").findOne({
      _id: new ObjectId(body.conversationId),
      participants: callerObjectId,
    })) as ConversationDoc | null;

    if (!conversation?._id) {
      return err(404, "Group conversation not found");
    }

    memberIds = (conversation.participants || [])
      .map((participant) => participant?.toString?.())
      .filter((id): id is string => Boolean(id) && id !== callerId);
  } else {
    const receiverId = body.receiverId;
    if (!receiverId || !ObjectId.isValid(receiverId)) {
      return err(400, "A valid receiver id is required");
    }
    if (receiverId === callerId) {
      return err(400, "You cannot call yourself");
    }

    receiverObjectId = new ObjectId(receiverId);

    const receiver = (await db.collection("users").findOne(
      { _id: receiverObjectId },
      { projection: { name: 1, email: 1, avatar: 1, image: 1, isAI: 1 } }
    )) as UserLite | null;

    if (!receiver?._id) {
      return err(404, "Receiver not found");
    }
    if (receiver.isAI) {
      return err(400, "AI assistants cannot be called");
    }

    const blockRelationship = await db.collection("blockedUsers").findOne({
      $or: [
        { blockerId: callerObjectId, blockedId: receiverObjectId },
        { blockerId: receiverObjectId, blockedId: callerObjectId },
      ],
    });

    if (blockRelationship) {
      return err(403, "Calling is disabled for this user", "BLOCKED");
    }

    conversation = (await db.collection<ConversationDoc>("conversations").findOne({
      participants: { $all: [callerObjectId, receiverObjectId] },
      isGroup: { $ne: true },
    })) as ConversationDoc | null;

    if (!conversation) {
      const [iFollow, followsMe] = await Promise.all([
        db.collection("follows").findOne({
          followerId: callerObjectId,
          followingId: receiverObjectId,
          status: "active",
        }),
        db.collection("follows").findOne({
          followerId: receiverObjectId,
          followingId: callerObjectId,
          status: "active",
        }),
      ]);

      if (!iFollow || !followsMe) {
        return err(403, "Calls are allowed only between mutual followers");
      }

      const now = new Date();
      const inserted = await db.collection("conversations").insertOne({
        participants: [callerObjectId, receiverObjectId],
        isGroup: false,
        createdAt: now,
        updatedAt: now,
      });
      conversation = {
        _id: inserted.insertedId,
        participants: [callerObjectId, receiverObjectId],
        isGroup: false,
      };
    }

    memberIds = [receiverId];
  }

  const roomName = `call-${randomUUID()}`;

  const call = await Call.create({
    roomName,
    callType,
    isGroup,
    callerId: callerObjectId,
    receiverId: receiverObjectId,
    participantIds: [
      callerObjectId,
      ...memberIds.map((id) => new ObjectId(id)),
    ],
    conversationId: conversation?._id ?? null,
    status: "ringing",
    startedAt: new Date(),
  });

  await ensureRoom({
    roomName,
    maxParticipants: isGroup ? 16 : 2,
  });

  const token = await createCallToken({
    roomName,
    identity: callerId,
    name: caller?.name || caller?.email || session.user.name || "Member",
    callType,
  });

  const response: CallCreateResponse = {
    callId: call._id.toString(),
    roomName,
    callType,
    isGroup,
    conversationId: conversation?._id?.toString(),
    token,
    url: getLiveKitPublicUrl(),
    from: toPeer(caller) || { id: callerId, name: session.user.name || "Member" },
    to: isGroup
      ? undefined
      : toPeer(
          (await db.collection("users").findOne(
            { _id: receiverObjectId! },
            { projection: { name: 1, email: 1, avatar: 1, image: 1 } }
          )) as UserLite | null
        ) || undefined,
    memberIds,
  };

  return { status: 200, data: response };
}

/** POST /api/calls/token */
export async function issueToken(
  session: Session | null,
  body: { roomName?: string; callId?: string; callType?: CallType }
): Promise<ControllerResult<CallTokenResponse>> {
  if (!session?.user?.id) {
    return err(401, "Unauthorized");
  }

  const userId = session.user.id;
  if (!ObjectId.isValid(userId)) {
    return err(400, "Invalid user id");
  }

  const query = body.roomName
    ? { roomName: body.roomName }
    : body.callId && ObjectId.isValid(body.callId)
      ? { _id: new ObjectId(body.callId) }
      : null;

  if (!query) {
    return err(400, "roomName or callId is required");
  }

  const call = await Call.findOne(query);
  if (!call) {
    return err(404, "Call not found");
  }

  const isParticipant =
    call.callerId?.toString() === userId ||
    call.receiverId?.toString() === userId ||
    (call.participantIds || []).some((id) => id?.toString() === userId);

  if (!isParticipant) {
    return err(403, "You are not a participant of this call");
  }

  if (["completed", "cancelled", "rejected", "missed"].includes(call.status)) {
    return err(410, "This call has already ended", "CALL_ENDED");
  }

  const db = await getNativeDb();
  const user = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { name: 1, email: 1 } }
  )) as UserLite | null;

  const token = await createCallToken({
    roomName: call.roomName,
    identity: userId,
    name: user?.name || user?.email || session.user.name || "Member",
    callType: call.callType,
  });

  return {
    status: 200,
    data: {
      token,
      url: getLiveKitPublicUrl(),
      roomName: call.roomName,
      identity: userId,
    },
  };
}

export interface EndCallResult {
  success: true;
  status: string;
  durationSeconds: number;
  message: Record<string, unknown> | null;
}

/** POST /api/calls/end */
export async function endCall(
  session: Session | null,
  body: {
    callId?: string;
    roomName?: string;
    reason?: "completed" | "missed" | "rejected" | "cancelled" | "busy";
  }
): Promise<ControllerResult<EndCallResult>> {
  if (!session?.user?.id) {
    return err(401, "Unauthorized");
  }

  const userId = session.user.id;
  const query = body.callId && ObjectId.isValid(body.callId)
    ? { _id: new ObjectId(body.callId) }
    : body.roomName
      ? { roomName: body.roomName }
      : null;

  if (!query) {
    return err(400, "callId or roomName is required");
  }

  const call = await Call.findOne(query);
  if (!call) {
    return err(404, "Call not found");
  }

  const isParticipant =
    call.callerId?.toString() === userId ||
    call.receiverId?.toString() === userId ||
    (call.participantIds || []).some((id) => id?.toString() === userId);

  if (!isParticipant) {
    return err(403, "You are not a participant of this call");
  }

  // Already finalized by another participant: return idempotently.
  if (call.endedAt) {
    return {
      status: 200,
      data: {
        success: true,
        status: call.status,
        durationSeconds: call.durationSeconds,
        message: null,
      },
    };
  }

  const endedAt = new Date();
  const answered = Boolean(call.answeredAt);
  const durationSeconds = answered
    ? Math.max(
        0,
        Math.round((endedAt.getTime() - new Date(call.answeredAt as Date).getTime()) / 1000)
      )
    : 0;

  let finalStatus: string;
  if (body.reason === "rejected") {
    finalStatus = "rejected";
  } else if (body.reason === "busy") {
    finalStatus = "busy";
  } else if (answered) {
    finalStatus = "completed";
  } else if (body.reason === "cancelled") {
    finalStatus = "cancelled";
  } else {
    finalStatus = "missed";
  }

  // Atomically claim the finalization so only one request writes the system message.
  const claimed = await Call.findOneAndUpdate(
    { _id: call._id, endedAt: null },
    {
      $set: {
        endedAt,
        durationSeconds,
        status: finalStatus,
      },
    },
    { new: true }
  );

  if (!claimed) {
    const latest = await Call.findById(call._id);
    return {
      status: 200,
      data: {
        success: true,
        status: latest?.status ?? finalStatus,
        durationSeconds: latest?.durationSeconds ?? durationSeconds,
        message: null,
      },
    };
  }

  let messagePayload: Record<string, unknown> | null = null;

  if (call.conversationId) {
    const db = await getNativeDb();
    const text = buildSystemMessageText(call.callType, finalStatus, durationSeconds);
    const encrypted = encryptChatText(text);
    const createdAt = new Date();

    const inserted = await db.collection("messages").insertOne({
      conversationId: call.conversationId,
      ...encrypted,
      text,
      senderId: call.callerId,
      receiverId: call.receiverId ?? null,
      createdAt,
      read: false,
      deliveredToUserIds: [call.callerId],
      readByUserIds: [call.callerId],
      starredByUserIds: [],
      hiddenForUserIds: [],
      deletedForUserIds: [],
      type: "text",
      chatMode: "normal",
      isCallMessage: true,
      callType: call.callType,
      callStatus: finalStatus,
      callDurationSeconds: durationSeconds,
      sentAt: createdAt,
    });

    await db.collection("conversations").updateOne(
      { _id: call.conversationId },
      { $set: { updatedAt: createdAt } }
    );

    await Call.updateOne(
      { _id: call._id },
      { $set: { systemMessageId: inserted.insertedId } }
    );

    messagePayload = {
      id: inserted.insertedId.toString(),
      conversationId: call.conversationId.toString(),
      text,
      content: text,
      senderId: call.callerId.toString(),
      receiverId: call.receiverId?.toString() ?? "",
      timestamp: createdAt.toISOString(),
      read: false,
      status: "sent",
      type: "text",
      attachments: [],
      deliveredToUserIds: [call.callerId.toString()],
      readByUserIds: [call.callerId.toString()],
      isCallMessage: true,
      callType: call.callType,
      callStatus: finalStatus,
      callDurationSeconds: durationSeconds,
    };
  }

  return {
    status: 200,
    data: {
      success: true,
      status: finalStatus,
      durationSeconds,
      message: messagePayload,
    },
  };
}

/** GET /api/calls/history */
export async function getHistory(
  session: Session | null,
  limit = 50
): Promise<ControllerResult<{ calls: CallHistoryItem[] }>> {
  if (!session?.user?.id) {
    return err(401, "Unauthorized");
  }

  const userId = session.user.id;
  if (!ObjectId.isValid(userId)) {
    return err(400, "Invalid user id");
  }

  const userObjectId = new ObjectId(userId);
  const calls = await Call.find({
    participantIds: userObjectId,
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .lean();

  const db = await getNativeDb();

  const peerIds = new Set<string>();
  calls.forEach((call) => {
    const otherId =
      call.callerId?.toString() === userId
        ? call.receiverId?.toString()
        : call.callerId?.toString();
    if (otherId) peerIds.add(otherId);
  });

  const peerUsers = peerIds.size
    ? ((await db
        .collection("users")
        .find(
          { _id: { $in: Array.from(peerIds).map((id) => new ObjectId(id)) } },
          { projection: { name: 1, email: 1, avatar: 1, image: 1 } }
        )
        .toArray()) as UserLite[])
    : [];

  const peerById = new Map<string, CallPeer>();
  peerUsers.forEach((user) => {
    const peer = toPeer(user);
    if (peer) peerById.set(peer.id, peer);
  });

  const history: CallHistoryItem[] = calls.map((call) => {
    const isOutgoing = call.callerId?.toString() === userId;
    const peerId = isOutgoing
      ? call.receiverId?.toString()
      : call.callerId?.toString();

    return {
      id: call._id.toString(),
      callType: call.callType,
      isGroup: Boolean(call.isGroup),
      direction: isOutgoing ? "outgoing" : "incoming",
      status: call.status,
      peer: peerId ? peerById.get(peerId) ?? null : null,
      conversationId: call.conversationId?.toString(),
      durationSeconds: call.durationSeconds || 0,
      startedAt: new Date(call.startedAt).toISOString(),
      answeredAt: call.answeredAt ? new Date(call.answeredAt).toISOString() : null,
      endedAt: call.endedAt ? new Date(call.endedAt).toISOString() : null,
    };
  });

  return { status: 200, data: { calls: history } };
}

/** Marks a call as answered (used when the receiver accepts). */
export async function markCallAnswered(
  session: Session | null,
  body: { callId?: string; roomName?: string }
): Promise<ControllerResult<{ success: true }>> {
  if (!session?.user?.id) {
    return err(401, "Unauthorized");
  }

  const query = body.callId && ObjectId.isValid(body.callId)
    ? { _id: new ObjectId(body.callId) }
    : body.roomName
      ? { roomName: body.roomName }
      : null;

  if (!query) {
    return err(400, "callId or roomName is required");
  }

  await Call.updateOne(
    { ...query, answeredAt: null },
    { $set: { answeredAt: new Date(), status: "ongoing" } }
  );

  return { status: 200, data: { success: true } };
}
