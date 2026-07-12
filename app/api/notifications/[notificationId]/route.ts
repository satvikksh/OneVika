import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import Notification from "@/app/models/Notification";
import mongoose from "mongoose";
import type { Model } from "mongoose";

type NotificationParamsContext = {
  params: Promise<{ notificationId: string }>;
};

type NotificationDocument = {
  userId: unknown;
  isRead?: boolean;
};

const NotificationModel = Notification as Model<NotificationDocument>;

async function resolveNotificationRequest(context: NotificationParamsContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
      notificationId: "",
    };
  }

  const { notificationId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return {
      error: NextResponse.json({ error: "Invalid notification id" }, { status: 400 }),
      session,
      notificationId,
    };
  }

  return { error: null, session, notificationId };
}

export async function PATCH(
  req: Request,
  context: NotificationParamsContext
) {
  try {
    const resolved = await resolveNotificationRequest(context);
    if (resolved.error) return resolved.error;

    await dbConnect();

    const filter: Record<string, unknown> = {
      _id: resolved.notificationId,
      userId: resolved.session.user.id,
    };

    const notification = await NotificationModel.findOneAndUpdate(
      filter,
      { $set: { isRead: true } },
      { new: true }
    ).populate("senderId", "name image avatar");

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, notification });
  } catch {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: NotificationParamsContext
) {
  try {
    const resolved = await resolveNotificationRequest(context);
    if (resolved.error) return resolved.error;

    await dbConnect();

    const filter: Record<string, unknown> = {
      _id: resolved.notificationId,
      userId: resolved.session.user.id,
    };

    const result = await NotificationModel.deleteOne(filter);

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
