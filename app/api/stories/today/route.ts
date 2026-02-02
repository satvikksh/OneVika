import { NextResponse } from "next/server";
import { dbConnect } from "../../../lib/mongodb";
import Story from "../../../models/Story";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id.toString();

  const stories = await Story.find({
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  const normalized = stories.map((story: any) => ({
    _id: story._id.toString(),
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
    isMine: story.userId.toString() === userId,
    seen: story.viewers?.some((v: any) => v.toString() === userId),
  }));

  return NextResponse.json(normalized);
}