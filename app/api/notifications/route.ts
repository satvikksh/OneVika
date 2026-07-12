import { NextResponse } from "next/server";
import { dbConnect } from "../../lib/mongodb";
import Notification from "../../models/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import type { Model } from "mongoose";

type NotificationDocument = {
  userId: unknown;
  isRead?: boolean;
};

const NotificationModel = Notification as Model<NotificationDocument>;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const filter: Record<string, unknown> = { userId: session.user.id };
    const notifications = await NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .populate("senderId", "name image avatar");

    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action?.toString?.() ?? "";

    if (action !== "mark-all-read") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    await dbConnect();

    const result = await NotificationModel.updateMany(
      { userId: session.user.id, isRead: { $ne: true } },
      { $set: { isRead: true } }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
