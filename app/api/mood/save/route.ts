import { NextResponse } from "next/server";
import {dbConnect} from "../../../lib/mongodb";
import UserMood from "../../../models/UserMood";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";


export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mood, energy } = await req.json();

  const dayKey = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  await dbConnect();

  await UserMood.findOneAndUpdate(
    { userId: session.user.id, dayKey },
    { mood, energy, createdAt: new Date() },
    { upsert: true, new: true }
  );

  return NextResponse.json({ success: true });
}
