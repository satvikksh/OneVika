export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { encryptChatText } from "@/app/lib/chatCrypto";
import { getNativeDb } from "@/app/lib/mongodb";

const { ObjectId } = mongoose.Types;

type ScheduledAction = "cancel" | "delete";

type ScheduledMessageUpdateBody = {
  text?: string;
  scheduledFor?: string;
  action?: ScheduledAction;
};

function parseFutureDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() <= Date.now() + 10_000) return null;
  return date;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { messageId } = await context.params;

    if (
      !session?.user?.id ||
      !ObjectId.isValid(session.user.id) ||
      !ObjectId.isValid(messageId)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as
      | ScheduledMessageUpdateBody
      | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const db = await getNativeDb();
    const senderId = new ObjectId(session.user.id);
    const _id = new ObjectId(messageId);
    const now = new Date();

    if (body.action === "cancel") {
      const result = await db.collection("messages").findOneAndUpdate(
        { _id, senderId, scheduledStatus: { $in: ["pending", "processing"] } },
        {
          $set: {
            scheduledStatus: "cancelled",
            updatedAt: now,
          },
        },
        { returnDocument: "after" }
      );

      if (!result) {
        return NextResponse.json(
          { error: "Scheduled message not found or already sent" },
          { status: 404 }
        );
      }

      console.info("[Scheduler] Scheduled message cancelled.", {
        messageId,
        senderId: session.user.id,
      });

      return NextResponse.json({
        success: true,
        message: {
          id: messageId,
          status: "scheduled",
          scheduledStatus: "cancelled",
        },
      });
    }

    const update: Record<string, unknown> = {
      updatedAt: now,
      scheduledStatus: "pending",
      scheduledAttempts: 0,
    };
    const unset: Record<string, string> = {
      scheduledLastError: "",
      scheduledProcessingStartedAt: "",
    };

    if (typeof body.text === "string") {
      const text = body.text.trim();
      if (!text) {
        return NextResponse.json(
          { error: "Message text cannot be empty" },
          { status: 400 }
        );
      }
      Object.assign(update, encryptChatText(text), { text });
    }

    if (body.scheduledFor) {
      const scheduledFor = parseFutureDate(body.scheduledFor);
      if (!scheduledFor) {
        return NextResponse.json(
          { error: "Scheduled time must be in the future" },
          { status: 400 }
        );
      }
      update.scheduledFor = scheduledFor;
    }

    if (Object.keys(update).length <= 3 && !body.scheduledFor) {
      return NextResponse.json(
        { error: "No editable scheduled message fields provided" },
        { status: 400 }
      );
    }

    const result = await db.collection("messages").findOneAndUpdate(
      { _id, senderId, scheduledStatus: { $in: ["pending", "failed"] } },
      {
        $set: update,
        $unset: unset,
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Scheduled message not found or already sent" },
        { status: 404 }
      );
    }

    console.info("[Scheduler] Scheduled message updated.", {
      messageId,
      senderId: session.user.id,
      scheduledFor: update.scheduledFor,
    });

    return NextResponse.json({
      success: true,
      message: {
        id: result._id.toString(),
        text: result.text ?? body.text,
        content: result.text ?? body.text,
        status: "scheduled",
        scheduledStatus: result.scheduledStatus,
        scheduledFor: result.scheduledFor?.toISOString?.(),
        scheduledAttempts: result.scheduledAttempts ?? 0,
      },
    });
  } catch (error) {
    console.error("[Scheduler] Update scheduled message failed:", error);
    return NextResponse.json(
      { error: "Failed to update scheduled message" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { messageId } = await context.params;

    if (
      !session?.user?.id ||
      !ObjectId.isValid(session.user.id) ||
      !ObjectId.isValid(messageId)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as
      | ScheduledMessageUpdateBody
      | null;
    const action: ScheduledAction = body?.action === "cancel" ? "cancel" : "delete";
    const db = await getNativeDb();
    const senderId = new ObjectId(session.user.id);
    const _id = new ObjectId(messageId);

    if (action === "cancel") {
      const result = await db.collection("messages").updateOne(
        { _id, senderId, scheduledStatus: { $in: ["pending", "processing"] } },
        {
          $set: {
            scheduledStatus: "cancelled",
            updatedAt: new Date(),
          },
        }
      );

      if (!result.matchedCount) {
        return NextResponse.json(
          { error: "Scheduled message not found or already sent" },
          { status: 404 }
        );
      }

      console.info("[Scheduler] Scheduled message cancelled.", { messageId });
      return NextResponse.json({ success: true, action: "cancel" });
    }

    const result = await db.collection("messages").deleteOne({
      _id,
      senderId,
      scheduledStatus: { $in: ["pending", "cancelled", "failed"] },
    });

    if (!result.deletedCount) {
      return NextResponse.json(
        { error: "Scheduled message not found or already sent" },
        { status: 404 }
      );
    }

    console.info("[Scheduler] Scheduled message deleted.", { messageId });
    return NextResponse.json({ success: true, action: "delete" });
  } catch (error) {
    console.error("[Scheduler] Delete scheduled message failed:", error);
    return NextResponse.json(
      { error: "Failed to delete scheduled message" },
      { status: 500 }
    );
  }
}
