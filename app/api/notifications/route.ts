import { NextResponse } from "next/server";
import { dbConnect } from "../../lib/mongodb";
import Notification from "../../models/Notification";

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const notifications = await Notification.find({ userId } as any)
      .sort({ createdAt: -1 })
      .populate("senderId", "name image");

    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}