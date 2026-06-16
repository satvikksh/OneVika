export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";

const { ObjectId } = mongoose.Types;

type ChatMode = "normal" | "vanish" | "polished";

type ConversationDoc = {
  _id: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  isGroup?: boolean;
};

const normalizeMode = (mode: unknown): ChatMode =>
  mode === "vanish" || mode === "polished" ? mode : "normal";

const normalizeVanishSeconds = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 300;
  return Math.min(Math.max(Math.round(parsed), 10), 86_400);
};

const getConversationForRequest = async ({
  db,
  currentUserId,
  conversationId,
  receiverId,
}: {
  db: Awaited<ReturnType<typeof getNativeDb>>;
  currentUserId: mongoose.Types.ObjectId;
  conversationId?: string;
  receiverId?: string;
}) => {
  if (conversationId) {
    if (!ObjectId.isValid(conversationId)) return null;
    return db.collection<ConversationDoc>("conversations").findOne({
      _id: new ObjectId(conversationId),
      participants: currentUserId,
    });
  }

  if (!receiverId || !ObjectId.isValid(receiverId)) return null;

  return db.collection<ConversationDoc>("conversations").findOne({
    participants: { $all: [currentUserId, new ObjectId(receiverId)] },
  });
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getNativeDb();
    const currentUserId = new ObjectId(session.user.id);
    const conversation = await getConversationForRequest({
      db,
      currentUserId,
      conversationId: req.nextUrl.searchParams.get("conversationId") ?? undefined,
      receiverId: req.nextUrl.searchParams.get("receiverId") ?? undefined,
    });

    if (!conversation?._id) {
      return NextResponse.json({
        mode: "normal",
        vanishSeconds: 300,
        chatType: "direct",
      });
    }

    const preference = await db.collection("chatModePreferences").findOne({
      userId: currentUserId,
      conversationId: conversation._id,
    });

    const chatType = conversation.isGroup ? "group" : "direct";
    const mode = chatType === "group" && preference?.mode === "polished"
      ? "normal"
      : normalizeMode(preference?.mode);

    return NextResponse.json({
      mode,
      vanishSeconds: normalizeVanishSeconds(preference?.vanishSeconds),
      chatType,
    });
  } catch (error) {
    console.error("[Chat Mode] Failed to fetch preference:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat mode" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const db = await getNativeDb();
    const currentUserId = new ObjectId(session.user.id);
    const conversation = await getConversationForRequest({
      db,
      currentUserId,
      conversationId: body.conversationId?.toString?.(),
      receiverId: body.receiverId?.toString?.(),
    });

    if (!conversation?._id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const requestedMode = normalizeMode(body.mode);
    const mode = conversation.isGroup && requestedMode === "polished"
      ? "normal"
      : requestedMode;
    const vanishSeconds = normalizeVanishSeconds(body.vanishSeconds);
    const now = new Date();

    await db.collection("chatModePreferences").updateOne(
      { userId: currentUserId, conversationId: conversation._id },
      {
        $set: {
          userId: currentUserId,
          conversationId: conversation._id,
          mode,
          vanishSeconds,
          chatType: conversation.isGroup ? "group" : "direct",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({
      mode,
      vanishSeconds,
      chatType: conversation.isGroup ? "group" : "direct",
    });
  } catch (error) {
    console.error("[Chat Mode] Failed to persist preference:", error);
    return NextResponse.json(
      { error: "Failed to save chat mode" },
      { status: 500 }
    );
  }
}
