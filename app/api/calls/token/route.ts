export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";
import { createLiveKitToken, getPublicLiveKitUrl } from "@/app/lib/livekit";
import { toObjectId } from "@/app/lib/calls";

type StringableId = {
  toString: () => string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userObjectId = toObjectId(session?.user?.id ?? null);

    if (!session?.user?.id || !userObjectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";
    const callId = typeof body?.callId === "string" ? body.callId.trim() : "";

    if (!roomId && !callId) {
      return NextResponse.json({ error: "roomId or callId is required" }, { status: 400 });
    }

    const db = await getNativeDb();
    const call = await db.collection("calls").findOne({
      ...(roomId ? { roomId } : { callId }),
      $or: [{ callerId: userObjectId }, { receiverIds: userObjectId }],
    });

    if (!call?.roomName) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const token = await createLiveKitToken({
      identity: session.user.id,
      name: session.user.name ?? session.user.id,
      roomName: call.roomName,
    });

    return NextResponse.json({
      token,
      url: getPublicLiveKitUrl(),
      roomName: call.roomName,
      roomId: call.roomId,
      callId: call.callId,
      callType: call.callType === "video" ? "video" : "audio",
      conversationId: call.conversationId?.toString?.(),
      status: call.status,
      callerId: call.callerId?.toString?.(),
      receiverIds: Array.isArray(call.receiverIds)
        ? call.receiverIds.map((id: StringableId) => id.toString())
        : [],
    });
  } catch (error) {
    console.error("[Calls] Token failed:", error);
    return NextResponse.json({ error: "Failed to generate call token" }, { status: 500 });
  }
}
