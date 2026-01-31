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

  await dbConnect();

  await UserMood.create({
    userId: session.user.id,
    mood,
    energy,
  });

  return NextResponse.json({ success: true });
}
