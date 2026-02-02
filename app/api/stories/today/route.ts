import { NextResponse } from "next/server";
import { dbConnect } from "../../../lib/mongodb";
import Story from "../../../models/Story";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

/* =========================
   GET /api/stories/today
========================= */
export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const stories = await Story.find({
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const normalizedStories = stories.map((story) => ({
    _id: story._id.toString(),

    // ✅ NORMALIZED MEDIA FIELD
 mediaUrl: story.mediaUrl,

    // ✅ FRONTEND NEEDS THIS
    isMine: userId ? story.userId?.toString() === userId : false,

    createdAt: story.createdAt,
  }));

  return NextResponse.json(normalizedStories);
}
