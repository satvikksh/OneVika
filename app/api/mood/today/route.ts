import { NextResponse } from "next/server";
import {dbConnect} from "../../../lib/mongodb";
import UserMood from "../../../models/UserMood";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ mood: "okay" });
  }

  await dbConnect();

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const mood = await UserMood.findOne({
    userId: session.user.id,
    createdAt: { $gte: start },
  }).sort({ createdAt: -1 });

  return NextResponse.json({
    mood: mood?.mood || "okay",
    energy: mood?.energy || 3,
  });
}
