export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";
import mongoose from "mongoose";
import { encryptChatText } from "@/app/lib/chatCrypto";
import cloudinary from "@/app/lib/cloudinary";
const { Types } = mongoose;
const { ObjectId } = Types;

type CloudinaryUploadResult = {
  secure_url: string;
  resource_type?: string;
};

type ConversationDoc = {
  _id: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  isGroup?: boolean;
  isAI?: boolean;
  aiAssistantUserId?: mongoose.Types.ObjectId;
  name?: string;
  createdBy?: mongoose.Types.ObjectId;
};

type ReceiverDoc = {
  isAI?: boolean;
};

type ScheduleMode = "now" | "delay" | "later";
type ChatMode = "normal" | "vanish" | "polished";

const getSocketServerUrl = () => {
  if (process.env.SOCKET_SERVER_URL) {
    return process.env.SOCKET_SERVER_URL.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production" && process.env.PORT) {
    return `http://127.0.0.1:${process.env.PORT}`;
  }

  return (process.env.NEXT_PUBLIC_SOCKET_URL || "http://127.0.0.1:3001").replace(
    /\/+$/,
    ""
  );
};

async function triggerAiReplyForSavedMessage(messageId: string) {
  const socketServerUrl = getSocketServerUrl();
  const internalSecret =
    process.env.SOCKET_INTERNAL_SECRET || process.env.NEXTAUTH_SECRET || "";
  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_TRIGGER_TIMEOUT_MS || "10000");
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${socketServerUrl}/internal/ai/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalSecret
          ? { Authorization: `Bearer ${internalSecret}` }
          : {}),
      },
      body: JSON.stringify({ messageId }),
      signal: controller.signal,
    });

    if (!response.ok && response.status !== 204) {
      console.warn("[AI Chat] Socket server declined AI reply trigger:", {
        socketServerUrl,
        status: response.status,
        statusText: response.statusText,
      });
    }
  } catch (error) {
    console.warn("[AI Chat] Unable to trigger AI reply from message API:", {
      socketServerUrl,
      timeoutMs,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}

const getMessageTypeFromMime = (mimeType?: string | null) => {
  if (!mimeType) return "file" as const;
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.startsWith("video/")) return "video" as const;
  if (mimeType.startsWith("audio/")) return "audio" as const;
  return "file" as const;
};

const normalizeChatMode = (mode: unknown): ChatMode =>
  mode === "vanish" || mode === "polished" ? mode : "normal";

const normalizeVanishSeconds = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 300;
  return Math.min(Math.max(Math.round(parsed), 10), 86_400);
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let text = "";
    let receiverId = "";
    let conversationId = "";
    let replyToId: string | undefined;
    let scheduleMode: ScheduleMode = "now";
    let scheduledForRaw = "";
    let delayMsRaw = "";
    let chatMode: ChatMode = "normal";
    let vanishSeconds = 300;
    let originalText = "";
    let uploadedAttachment:
      | {
          url: string;
          type: "image" | "video" | "audio" | "file";
          mimeType?: string;
          fileName?: string;
          size?: number;
          targetUrl?: string;
          source?: "feed" | "upload" | "link";
        }
      | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      text = (formData.get("text") ?? formData.get("content") ?? "").toString();
      receiverId = (formData.get("receiverId") ?? "").toString();
      conversationId = (formData.get("conversationId") ?? "").toString();
      replyToId = (formData.get("replyToId") ?? "").toString() || undefined;
      scheduleMode =
        ((formData.get("scheduleMode") ?? "now").toString() as ScheduleMode) ||
        "now";
      scheduledForRaw = (formData.get("scheduledFor") ?? "").toString();
      delayMsRaw = (formData.get("delayMs") ?? "").toString();
      chatMode = normalizeChatMode(formData.get("chatMode"));
      vanishSeconds = normalizeVanishSeconds(formData.get("vanishSeconds"));
      originalText = (formData.get("originalText") ?? "").toString();
      const file = formData.get("file");

      if (file instanceof File && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: "chat-messages",
              resource_type: "auto",
              use_filename: true,
              unique_filename: true,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });

        uploadedAttachment = {
          url: uploadResult.secure_url,
          type: getMessageTypeFromMime(file.type || uploadResult.resource_type),
          mimeType: file.type || undefined,
          fileName: file.name || undefined,
          size: file.size || undefined,
          source: "upload",
        };
      }
    } else {
      const body = await req.json();
      text = (body?.text ?? body?.content ?? "").toString();
      receiverId = body?.receiverId as string;
      conversationId = body?.conversationId as string;
      replyToId = body?.replyToId as string | undefined;
      scheduleMode = (body?.scheduleMode as ScheduleMode) || "now";
      scheduledForRaw = body?.scheduledFor?.toString?.() ?? "";
      delayMsRaw = body?.delayMs?.toString?.() ?? "";
      chatMode = normalizeChatMode(body?.chatMode);
      vanishSeconds = normalizeVanishSeconds(body?.vanishSeconds);
      originalText = (body?.originalText ?? "").toString();
      const attachments = Array.isArray(body?.attachments) ? body.attachments : [];
      const firstAttachment = attachments[0];
      if (firstAttachment?.url) {
        uploadedAttachment = {
          url: firstAttachment.url,
          type: firstAttachment.type || "file",
          mimeType: firstAttachment.mimeType,
          fileName: firstAttachment.fileName,
          size: firstAttachment.size,
          targetUrl: firstAttachment.targetUrl,
          source: firstAttachment.source || "link",
        };
      }
    }

    if ((!text?.trim() && !uploadedAttachment) || (!receiverId && !conversationId)) {
      return NextResponse.json(
        { error: "Message content or attachment and a conversation target are required" },
        { status: 400 }
      );
    }

    if (
      !ObjectId.isValid(session.user.id) ||
      (receiverId && !ObjectId.isValid(receiverId)) ||
      (conversationId && !ObjectId.isValid(conversationId))
    ) {
      return NextResponse.json(
        { error: "Invalid sender or conversation target" },
        { status: 400 }
      );
    }

    const db = await getNativeDb();

    const senderObjectId = new ObjectId(session.user.id);
    let receiverObjectId =
      receiverId && ObjectId.isValid(receiverId) ? new ObjectId(receiverId) : null;
    let conversation: ConversationDoc | null = null;
    let isGroupConversation = false;
    let isAiConversation = false;

    if (conversationId) {
      conversation = await db.collection<ConversationDoc>("conversations").findOne({
        _id: new ObjectId(conversationId),
        participants: senderObjectId,
      });

      if (!conversation?._id) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      isGroupConversation = Boolean(conversation.isGroup);
      isAiConversation = Boolean(conversation.isAI);

      if (!isGroupConversation && !receiverObjectId) {
        const otherParticipant = conversation.participants?.find(
          (participant) => participant?.toString?.() !== session.user.id
        );
        receiverObjectId = otherParticipant
          ? new ObjectId(otherParticipant.toString())
          : null;
      }
    } else {
      if (!receiverObjectId) {
        return NextResponse.json(
          { error: "Receiver is required for direct messages" },
          { status: 400 }
        );
      }

      const receiver = await db.collection<ReceiverDoc>("users").findOne(
        { _id: receiverObjectId },
        { projection: { isAI: 1 } }
      );
      const isAiReceiver = Boolean(receiver?.isAI);

      const blockRelationship = await db.collection("blockedUsers").findOne({
        $or: [
          { blockerId: senderObjectId, blockedId: receiverObjectId },
          { blockerId: receiverObjectId, blockedId: senderObjectId },
        ],
      });

      if (blockRelationship) {
        return NextResponse.json(
          { error: "Messaging is disabled for this user" },
          { status: 403 }
        );
      }

      conversation = await db.collection<ConversationDoc>("conversations").findOne({
        participants: { $all: [senderObjectId, receiverObjectId] },
      });

      const [iFollowReceiver, receiverFollowsMe] = await Promise.all([
        db.collection("follows").findOne({
          followerId: senderObjectId,
          followingId: receiverObjectId,
          status: "active",
        }),
        db.collection("follows").findOne({
          followerId: receiverObjectId,
          followingId: senderObjectId,
          status: "active",
        }),
      ]);

      const hasMutualFollow = Boolean(iFollowReceiver && receiverFollowsMe);
      const hasExistingConversation = Boolean(conversation);

      if (!hasMutualFollow && !hasExistingConversation && !isAiReceiver) {
        return NextResponse.json(
          { error: "Message allowed only for mutual followers" },
          { status: 403 }
        );
      }

      if (!conversation) {
        const now = new Date();
        const result = await db.collection("conversations").insertOne({
          participants: [senderObjectId, receiverObjectId],
          ...(isAiReceiver
            ? {
                isAI: true,
                aiAssistantUserId: receiverObjectId,
              }
            : {}),
          createdAt: now,
          updatedAt: now,
        });
        conversation = {
          _id: result.insertedId,
          participants: [senderObjectId, receiverObjectId],
          isGroup: false,
          isAI: isAiReceiver,
          aiAssistantUserId: isAiReceiver ? receiverObjectId : undefined,
        };
      }

      isAiConversation = Boolean(conversation?.isAI || isAiReceiver);
    }

    if (!conversation?._id) {
      return NextResponse.json(
        { error: "Conversation could not be resolved" },
        { status: 400 }
      );
    }

    if (isGroupConversation && chatMode === "polished") {
      return NextResponse.json(
        { error: "Polished Mode is only available in personal chats" },
        { status: 400 }
      );
    }

    const createdAt = new Date();
    let scheduledFor: Date | null = null;
    const normalizedScheduleMode: ScheduleMode =
      scheduleMode === "delay" || scheduleMode === "later" ? scheduleMode : "now";

    if (normalizedScheduleMode === "delay") {
      const delayMs = Number(delayMsRaw);
      if (!Number.isFinite(delayMs) || delayMs < 60_000) {
        return NextResponse.json(
          { error: "Delay must be at least 1 minute" },
          { status: 400 }
        );
      }
      scheduledFor = new Date(createdAt.getTime() + delayMs);
    } else if (normalizedScheduleMode === "later") {
      const parsed = new Date(scheduledForRaw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "A valid schedule date and time is required" },
          { status: 400 }
        );
      }
      scheduledFor = parsed;
    }

    if (scheduledFor && scheduledFor.getTime() <= Date.now() + 10_000) {
      return NextResponse.json(
        { error: "Scheduled time must be at least a few seconds in the future" },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    const encrypted = trimmedText ? encryptChatText(trimmedText) : {};
    const messageType = uploadedAttachment?.type ?? "text";
    const isScheduled = Boolean(scheduledFor);
    const effectiveChatMode = chatMode === "polished" ? "polished" : chatMode === "vanish" ? "vanish" : "normal";
    const vanishExpiresAt =
      effectiveChatMode === "vanish"
        ? new Date((scheduledFor ?? createdAt).getTime() + vanishSeconds * 1000)
        : null;

    const result = await db.collection("messages").insertOne({
      conversationId: conversation._id,
      ...encrypted,
      ...(trimmedText ? { text: trimmedText } : {}),
      senderId: senderObjectId,
      receiverId: receiverObjectId,
      createdAt,
      read: false,
      deliveredToUserIds: [senderObjectId],
      readByUserIds: [senderObjectId],
      starredByUserIds: [],
      hiddenForUserIds: [],
      deletedForUserIds: [],
      type: messageType,
      chatMode: effectiveChatMode,
      ...(effectiveChatMode === "polished" && originalText.trim()
        ? { originalText: originalText.trim() }
        : {}),
      ...(vanishExpiresAt
        ? {
            vanishSeconds,
            vanishExpiresAt,
            deleteAfter: vanishExpiresAt,
          }
        : {}),
      ...(uploadedAttachment ? { attachments: [uploadedAttachment] } : {}),
      ...(replyToId ? { replyToId } : {}),
      ...(isScheduled
        ? {
            scheduledFor,
            scheduledStatus: "pending",
            scheduledMode: normalizedScheduleMode,
            scheduledAttempts: 0,
            sentAt: null,
          }
        : { sentAt: createdAt }),
    });

    if (!isScheduled) {
      await db.collection("conversations").updateOne(
        { _id: conversation._id },
        { $set: { updatedAt: createdAt } }
      );
    }

    if (!isScheduled && isAiConversation && trimmedText) {
      await triggerAiReplyForSavedMessage(result.insertedId.toString());
    }

    console.info(isScheduled ? "[Scheduler] Scheduled message created." : "Message sent.", {
      messageId: result.insertedId.toString(),
      conversationId: conversation._id.toString(),
      senderId: session.user.id,
      scheduledFor: scheduledFor?.toISOString?.(),
      chatType: isGroupConversation ? "group" : "direct",
    });

    return NextResponse.json({
      success: true,
      message: {
        id: result.insertedId.toString(),
        conversationId: conversation._id.toString(),
        text: trimmedText,
        content: trimmedText,
        senderId: session.user.id,
        receiverId: receiverObjectId?.toString?.() ?? "",
        timestamp: createdAt.toISOString(),
        read: false,
        status: isScheduled ? "scheduled" : "sent",
        type: messageType,
        attachments: uploadedAttachment ? [uploadedAttachment] : [],
        replyToId,
        deliveredToUserIds: [session.user.id],
        readByUserIds: [session.user.id],
        isStarred: false,
        isHidden: false,
        isAI: false,
        isStreaming: false,
        scheduledFor: scheduledFor?.toISOString?.(),
        scheduledStatus: isScheduled ? "pending" : undefined,
        scheduledAttempts: isScheduled ? 0 : undefined,
        chatMode: effectiveChatMode,
        vanishSeconds: vanishExpiresAt ? vanishSeconds : undefined,
        vanishExpiresAt: vanishExpiresAt?.toISOString?.(),
        originalText:
          effectiveChatMode === "polished" && originalText.trim()
            ? originalText.trim()
            : undefined,
        chatType: isGroupConversation ? "group" : "direct",
      },
    });
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
