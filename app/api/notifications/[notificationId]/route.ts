import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import Notification from "@/app/models/Notification";
import mongoose from "mongoose";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ notificationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
    }

    await dbConnect();

    const result = await Notification.deleteOne({
      _id: notificationId,
      userId: session.user.id,
    } as any);

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
