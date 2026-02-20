import { NextResponse } from "next/server";
import { dbConnect } from "../../../lib/mongodb";
import Story from "../../../models/Story";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import mongoose from "mongoose";

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
  const db = mongoose.connection.db;

  if (!db) {
    return NextResponse.json({ message: "Database unavailable" }, { status: 500 });
  }

  const follows = await db.collection("follows")
    .find({
      followerId: new mongoose.Types.ObjectId(userId),
      status: "active",
    })
    .project({ followingId: 1 })
    .toArray();

  const followedIds = follows
    .map((f: any) => f.followingId)
    .filter(Boolean);

  const allowedUserIds = [
    new mongoose.Types.ObjectId(userId),
    ...followedIds,
  ];

  const stories = await Story.find({
    expiresAt: { $gt: new Date() },
    userId: { $in: allowedUserIds },
  })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const normalized = stories.map((story: any) => {
    const storyUserId =
      story.userId?._id?.toString?.() ?? story.userId?.toString?.();

    return {
      _id: story._id.toString(),
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      isMine: storyUserId === userId,
      seen: story.viewers?.some((v: any) => v.toString() === userId),
      username: story.userId?.name ?? "Unknown",
    };
  });

  return NextResponse.json(normalized);
}
