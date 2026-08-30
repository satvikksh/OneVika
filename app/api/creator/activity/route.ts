// app/api/creator/activity/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import {
  recordActivity,
  IngestEvent,
  IngestEventType,
} from "@/app/lib/creator-revenue/service";
import { rejectIfInactive } from "@/app/lib/user-status";

const ALLOWED_EVENT_TYPES: IngestEventType[] = [
  "view_start",
  "watch",
  "complete",
  "like",
  "comment",
  "follow",
  "share",
];

const MAX_BATCH = 50;
const MAX_STR_LEN = 2000;

function validateEvent(event: Record<string, unknown>): IngestEvent | null {
  if (!event || typeof event !== "object") return null;
  const eventType = event.eventType as IngestEventType | undefined;
  if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType)) return null;

  const isFollow = eventType === "follow";

  if (isFollow) {
    if (typeof event.creatorId !== "string" || !Types.ObjectId.isValid(event.creatorId)) {
      return null;
    }
  } else if (
    typeof event.contentId !== "string" ||
    !Types.ObjectId.isValid(event.contentId)
  ) {
    return null;
  }
  if (
    event.creatorId !== undefined &&
    (typeof event.creatorId !== "string" || !Types.ObjectId.isValid(event.creatorId))
  ) {
    return null;
  }
  if (
    event.eventId !== undefined &&
    (typeof event.eventId !== "string" || event.eventId.length > 256)
  ) {
    return null;
  }
  const watchedMs = event.watchedMs;
  if (
    watchedMs !== undefined &&
    (typeof watchedMs !== "number" || !Number.isFinite(watchedMs) || watchedMs < 0)
  ) {
    return null;
  }
  const durationMs = event.durationMs;
  if (
    durationMs !== undefined &&
    (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0)
  ) {
    return null;
  }
  if (
    event.completed !== undefined &&
    typeof event.completed !== "boolean"
  ) {
    return null;
  }
  if (
    event.commentText !== undefined &&
    (typeof event.commentText !== "string" || event.commentText.length > MAX_STR_LEN)
  ) {
    return null;
  }

  const clean: IngestEvent = {
    eventType,
  };
  if (event.contentId !== undefined) clean.contentId = event.contentId as string;
  if (event.creatorId !== undefined) clean.creatorId = event.creatorId as string;
  if (event.eventId !== undefined) clean.eventId = event.eventId as string;
  if (watchedMs !== undefined) clean.watchedMs = watchedMs as number;
  if (durationMs !== undefined) clean.durationMs = durationMs as number;
  if (event.completed !== undefined) clean.completed = event.completed as boolean;
  if (event.commentText !== undefined) clean.commentText = event.commentText as string;
  return clean;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inactiveReason = await rejectIfInactive(session.user.id);
    if (inactiveReason) {
      return NextResponse.json({ error: inactiveReason }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const rawEvents = body?.events;
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 });
    }
    if (rawEvents.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `Too many events in one batch (max ${MAX_BATCH})` },
        { status: 400 }
      );
    }

    const events: IngestEvent[] = [];
    for (const raw of rawEvents) {
      const event =
        raw && typeof raw === "object"
          ? validateEvent(raw as Record<string, unknown>)
          : null;
      if (event) events.push(event);
    }

    if (events.length === 0) {
      return NextResponse.json({ error: "No valid events" }, { status: 400 });
    }

    await dbConnect();

    const result = await recordActivity({
      viewerId: new Types.ObjectId(session.user.id),
      events,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error recording creator activity:", error);
    return NextResponse.json(
      { error: "Failed to record activity" },
      { status: 500 }
    );
  }
}