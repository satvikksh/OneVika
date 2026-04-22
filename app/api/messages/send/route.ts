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
  name?: string;
  createdBy?: mongoose.Types.ObjectId;
};

const getMessageTypeFromMime = (mimeType?: string | null) => {
  if (!mimeType) return "file" as const;
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.startsWith("video/")) return "video" as const;
  if (mimeType.startsWith("audio/")) return "audio" as const;
  return "file" as const;
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

      if (!hasMutualFollow && !hasExistingConversation) {
        return NextResponse.json(
          { error: "Message allowed only for mutual followers" },
          { status: 403 }
        );
      }

      if (!conversation) {
        const now = new Date();
        const result = await db.collection("conversations").insertOne({
          participants: [senderObjectId, receiverObjectId],
          createdAt: now,
          updatedAt: now,
        });
        conversation = {
          _id: result.insertedId,
          participants: [senderObjectId, receiverObjectId],
          isGroup: false,
        };
      }
    }

    if (!conversation?._id) {
      return NextResponse.json(
        { error: "Conversation could not be resolved" },
        { status: 400 }
      );
    }

    const createdAt = new Date();
    const trimmedText = text.trim();
    const encrypted = trimmedText ? encryptChatText(trimmedText) : {};
    const messageType = uploadedAttachment?.type ?? "text";

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
      ...(uploadedAttachment ? { attachments: [uploadedAttachment] } : {}),
      ...(replyToId ? { replyToId } : {}),
    });

    await db.collection("conversations").updateOne(
      { _id: conversation._id },
      { $set: { updatedAt: createdAt } }
    );

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
        status: "sent",
        type: messageType,
        attachments: uploadedAttachment ? [uploadedAttachment] : [],
        replyToId,
        deliveredToUserIds: [session.user.id],
        readByUserIds: [session.user.id],
        isStarred: false,
        isHidden: false,
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
