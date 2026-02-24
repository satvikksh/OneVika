import { NextResponse } from "next/server";
import { dbConnect } from "../../lib/mongodb";
import Notification from "../../models/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const notifications = await Notification.find({ userId: session.user.id } as any)
      .sort({ createdAt: -1 })
      .populate("senderId", "name image avatar");

    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
