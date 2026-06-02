export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { decryptChatText } from "@/app/lib/chatCrypto";
import { getNativeDb } from "@/app/lib/mongodb";

const { ObjectId } = mongoose.Types;

type ScheduledMessageDoc = {
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
  attachments?: unknown[];
  replyToId?: mongoose.Types.ObjectId | string;
  scheduledFor?: Date;
  scheduledStatus?: "pending" | "processing" | "sent" | "cancelled" | "failed";
  scheduledAttempts?: number;
  scheduledLastError?: string;
};

function readText(message: ScheduledMessageDoc) {
  if (message.text) return message.text;
  if (!message.textCipher || !message.textIv || !message.textTag) return "";

  try {
    return decryptChatText({
      textCipher: message.textCipher,
      textIv: message.textIv,
      textTag: message.textTag,
    });
  } catch (error) {
    console.error("[Scheduler] Scheduled message decrypt failed:", error);
    return "[Unable to decrypt message]";
  }
}

function formatScheduledMessage(message: ScheduledMessageDoc) {
  const text = readText(message);

  return {
    id: message._id.toString(),
    conversationId: message.conversationId.toString(),
    senderId: message.senderId.toString(),
    receiverId: message.receiverId?.toString?.() ?? "",
    text,
    content: text,
    timestamp: message.createdAt?.toISOString?.() ?? new Date().toISOString(),
    type: message.type ?? "text",
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    replyToId: message.replyToId?.toString?.() || undefined,
    status:
      message.scheduledStatus === "failed"
        ? "failed"
        : message.scheduledStatus === "sent"
          ? "sent"
          : "scheduled",
    scheduledFor: message.scheduledFor?.toISOString?.(),
    scheduledStatus: message.scheduledStatus,
    scheduledAttempts: message.scheduledAttempts ?? 0,
    scheduledLastError: message.scheduledLastError,
    deliveredToUserIds: [message.senderId.toString()],
    readByUserIds: [message.senderId.toString()],
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (conversationId && !ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation id" },
        { status: 400 }
      );
    }

    const db = await getNativeDb();
    const senderId = new ObjectId(session.user.id);
    const query: Record<string, unknown> = {
      senderId,
      scheduledStatus: { $in: ["pending", "processing", "failed"] },
    };

    if (conversationId) {
      query.conversationId = new ObjectId(conversationId);
    }

    const messages = await db
      .collection<ScheduledMessageDoc>("messages")
      .find(query)
      .sort({ scheduledFor: 1, _id: 1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      messages: messages.map(formatScheduledMessage),
    });
  } catch (error) {
    console.error("[Scheduler] List scheduled messages failed:", error);
    return NextResponse.json(
      { error: "Failed to load scheduled messages" },
      { status: 500 }
    );
  }
}
