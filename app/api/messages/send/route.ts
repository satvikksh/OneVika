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

    if ((!text?.trim() && !uploadedAttachment) || !receiverId) {
      return NextResponse.json(
        { error: "Message content or attachment and receiverId required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(receiverId) || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json(
        { error: "Invalid sender or receiver id" },
        { status: 400 }
      );
    }

    const db = await getNativeDb();

    const senderObjectId = new ObjectId(session.user.id);
    const receiverObjectId = new ObjectId(receiverId);

    let conversation = await db.collection("conversations").findOne({
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
      const result = await db.collection("conversations").insertOne({
        participants: [senderObjectId, receiverObjectId],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      conversation = { _id: result.insertedId };
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
        senderId: session.user.id,
        receiverId,
        timestamp: createdAt.toISOString(),
        read: false,
        type: messageType,
        attachments: uploadedAttachment ? [uploadedAttachment] : [],
        replyToId,
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
