export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";
import {
  createLiveKitToken,
  createOrGetLiveKitRoom,
  getPublicLiveKitUrl,
  buildCallRoomName,
} from "@/app/lib/livekit";
import { resolveCallConversation, toObjectId } from "@/app/lib/calls";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const callerId = toObjectId(session?.user?.id ?? null);

    if (!callerId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const receiverIds = (
      Array.isArray(body?.receiverIds)
        ? body.receiverIds.map((id: unknown) => toObjectId(String(id)))
        : []
    ).filter((id): id is NonNullable<typeof id> => Boolean(id));
    const callType = body?.callType === "video" ? "video" : "audio";
    const conversationId = toObjectId(body?.conversationId?.toString?.() ?? null);

    if (receiverIds.length === 0) {
      return NextResponse.json({ error: "At least one receiver is required" }, { status: 400 });
    }

    const conversation = await resolveCallConversation({
      callerId,
      receiverIds,
      conversationId,
    });

    if (!conversation?._id) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const callId = crypto.randomUUID();
    const roomName = buildCallRoomName(callId);
    const roomId = roomName;
    const now = new Date();

    await createOrGetLiveKitRoom(roomName);

    const db = await getNativeDb();
    await db.collection("calls").insertOne({
      callId,
      callerId,
      receiverIds,
      conversationId: conversation._id,
      roomId,
      roomName,
      callType,
      status: "Ringing",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const token = await createLiveKitToken({
      identity: session.user.id,
      name: session.user.name ?? session.user.id,
      roomName,
    });

    return NextResponse.json({
      callId,
      roomId,
      roomName,
      token,
      url: getPublicLiveKitUrl(),
      callType,
      conversationId: conversation._id.toString(),
    });
  } catch (error) {
    console.error("[Calls] Create failed:", error);
    return NextResponse.json({ error: "Failed to create call" }, { status: 500 });
  }
}
