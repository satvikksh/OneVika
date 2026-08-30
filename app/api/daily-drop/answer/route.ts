import { NextResponse } from "next/server";
import {dbConnect} from "../../../lib/mongodb";
import DailyDropResponse from "../../../models/DailyDropResponse";
import UserMood from "../../../models/UserMood";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { rejectIfInactive } from "../../../lib/user-status";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inactiveReason = await rejectIfInactive(session.user.id);
  if (inactiveReason) {
    return NextResponse.json({ error: inactiveReason }, { status: 403 });
  }

  const { response } = await req.json();

  await dbConnect();

  const mood = await UserMood.findOne({ userId: session.user.id }).sort({
    createdAt: -1,
  });

  await DailyDropResponse.create({
    userId: session.user.id,
    userName: session.user.name || "Anonymous",
    mood: mood?.mood || "okay",
    response,
  });

  return NextResponse.json({ success: true });
}
