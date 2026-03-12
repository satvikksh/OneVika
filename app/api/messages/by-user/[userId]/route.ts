import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import mongoose from "mongoose";
import { decryptChatText } from "@/app/lib/chatCrypto";

const { ObjectId } = mongoose.Types;

type StoredAttachment = {
  url?: string;
  type?: "image" | "video" | "audio" | "file";
  mimeType?: string;
  fileName?: string;
  size?: number;
  targetUrl?: string;
  source?: "feed" | "upload" | "link";
};

type StoredMessage = {
  _id: mongoose.Types.ObjectId;
  text?: string;
  textCipher?: string;
  textIv?: string;
  textTag?: string;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  createdAt: Date;
  read?: boolean;
  type?: "text" | "image" | "video" | "audio" | "file";
  attachments?: StoredAttachment[];
  replyToId?: mongoose.Types.ObjectId | string;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    /* ---------------- AUTH ---------------- */
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* 🔥 FIX: await params */
    const { userId: receiverIdRaw } = await context.params;
    const senderIdRaw = session.user.id;

    if (!receiverIdRaw) {
      return NextResponse.json(
        { error: "User id is required" },
        { status: 400 }
      );
    }

    if (
      !ObjectId.isValid(receiverIdRaw) ||
      !ObjectId.isValid(senderIdRaw)
    ) {
      return NextResponse.json(
        { error: "Invalid MongoDB user id" },
        { status: 400 }
      );
    }

    if (receiverIdRaw === senderIdRaw) {
      return NextResponse.json({ messages: [] });
    }

    /* ---------------- DB ---------------- */
    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const senderId = new ObjectId(senderIdRaw);
    const receiverId = new ObjectId(receiverIdRaw);

    /* ---------------- FIND CONVERSATION ---------------- */
    const conversation = await db.collection("conversations").findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    /* ---------------- FETCH MESSAGES ---------------- */
    const messages = await db
      .collection("messages")
      .find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .toArray();

    /* ---------------- FORMAT RESPONSE ---------------- */
    const formatted = messages.map((m) => {
      const message = m as StoredMessage;
      let text = message.text || "";

      // New encrypted storage path
      if (!text && message.textCipher && message.textIv && message.textTag) {
        try {
          text = decryptChatText({
            textCipher: message.textCipher,
            textIv: message.textIv,
            textTag: message.textTag,
          });
        } catch (e) {
          console.error("MESSAGE DECRYPT ERROR:", e);
          text = "[Unable to decrypt message]";
        }
      }

      return {
        id: message._id.toString(),
        text,
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
        conversationId: message.conversationId.toString(),
        timestamp: message.createdAt,
        read: Boolean(message.read),
        type:
          message.type ||
          (Array.isArray(message.attachments) && message.attachments[0]?.type) ||
          "text",
        attachments: Array.isArray(message.attachments)
          ? message.attachments.map((attachment) => ({
              url: attachment.url,
              type: attachment.type || "file",
              mimeType: attachment.mimeType,
              fileName: attachment.fileName,
              size: attachment.size,
              targetUrl: attachment.targetUrl,
              source: attachment.source,
            }))
          : [],
        replyToId: message.replyToId?.toString?.() || undefined,
      };
    });

    return NextResponse.json({ messages: formatted });
  } catch (error) {
    console.error("FETCH MESSAGES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
