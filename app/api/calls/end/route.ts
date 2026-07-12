export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";
import {
  CallRecord,
  StoredCallStatus,
  createMissedCallNotifications,
  insertCallSystemMessage,
  toObjectId,
} from "@/app/lib/calls";

const FINAL_STATUSES = new Set<StoredCallStatus>([
  "Missed",
  "Rejected",
  "Completed",
  "Cancelled",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userObjectId = toObjectId(session?.user?.id ?? null);

    if (!session?.user?.id || !userObjectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const callId = typeof body?.callId === "string" ? body.callId.trim() : "";
    const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";
    const status = FINAL_STATUSES.has(body?.status) ? body.status : "Completed";

    if (!callId && !roomId) {
      return NextResponse.json({ error: "callId or roomId is required" }, { status: 400 });
    }

    const db = await getNativeDb();
    const now = new Date();
    const call = (await db.collection("calls").findOne({
      ...(callId ? { callId } : { roomId }),
      $or: [{ callerId: userObjectId }, { receiverIds: userObjectId }],
    })) as CallRecord | null;

    if (!call?._id) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (call.status !== "Ringing") {
      return NextResponse.json({ call, message: "Call already ended" });
    }

    const startedAt = call.startedAt ?? call.createdAt ?? now;
    const durationSeconds =
      status === "Completed"
        ? Math.max(0, Math.round((now.getTime() - new Date(startedAt).getTime()) / 1000))
        : 0;

    const updated = (await db.collection("calls").findOneAndUpdate(
      { _id: call._id },
      {
        $set: {
          status,
          endedAt: now,
          durationSeconds,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    )) as CallRecord | null;

    const finalCall = updated ?? {
      ...call,
      status,
      endedAt: now,
      durationSeconds,
      updatedAt: now,
    };

    const message =
      status === "Completed" || status === "Missed"
        ? await insertCallSystemMessage(finalCall)
        : null;
    const notifications =
      status === "Missed" || status === "Cancelled"
        ? await createMissedCallNotifications(finalCall)
        : [];

    return NextResponse.json({ success: true, call: finalCall, message, notifications });
  } catch (error) {
    console.error("[Calls] End failed:", error);
    return NextResponse.json({ error: "Failed to end call" }, { status: 500 });
  }
}
