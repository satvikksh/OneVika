export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";
import { toObjectId } from "@/app/lib/calls";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userObjectId = toObjectId(session?.user?.id ?? null);

    if (!session?.user?.id || !userObjectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getNativeDb();
    const calls = await db
      .collection("calls")
      .find({
        $or: [{ callerId: userObjectId }, { receiverIds: userObjectId }],
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      calls: calls.map((call) => ({
        id: call._id.toString(),
        callId: call.callId,
        roomId: call.roomId,
        roomName: call.roomName,
        callerId: call.callerId?.toString?.(),
        receiverIds: Array.isArray(call.receiverIds)
          ? call.receiverIds.map((id) => id.toString())
          : [],
        conversationId: call.conversationId?.toString?.(),
        callType: call.callType,
        status: call.status,
        startTime: call.startedAt?.toISOString?.() ?? call.createdAt?.toISOString?.(),
        endTime: call.endedAt?.toISOString?.(),
        duration: call.durationSeconds ?? 0,
      })),
    });
  } catch (error) {
    console.error("[Calls] History failed:", error);
    return NextResponse.json({ error: "Failed to load call history" }, { status: 500 });
  }
}
