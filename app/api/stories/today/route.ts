import { NextResponse } from "next/server";
import { dbConnect } from "../../../lib/mongodb";
import Story from "../../../models/Story";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import mongoose from "mongoose";

type FollowRow = {
  followingId?: mongoose.Types.ObjectId;
};

type PopulatedStoryRow = {
  _id: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: "image" | "video";
  userId?:
    | mongoose.Types.ObjectId
    | {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        email?: string;
        image?: string;
        avatar?: string;
      };
  viewers?: mongoose.Types.ObjectId[];
  viewerDetails?: {
    viewerId?: mongoose.Types.ObjectId;
  }[];
};

function isPopulatedStoryUser(
  user: PopulatedStoryRow["userId"]
): user is Exclude<PopulatedStoryRow["userId"], mongoose.Types.ObjectId | undefined> {
  return Boolean(user && typeof user === "object" && ("name" in user || "email" in user));
}

function countNonOwnerViewers(story: PopulatedStoryRow, ownerId?: string) {
  const viewerIds = new Set<string>();

  for (const viewerId of story.viewers ?? []) {
    const id = viewerId.toString();
    if (id && id !== ownerId) viewerIds.add(id);
  }

  for (const detail of story.viewerDetails ?? []) {
    const id = detail.viewerId?.toString();
    if (id && id !== ownerId) viewerIds.add(id);
  }

  return viewerIds.size;
}

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
    .toArray() as FollowRow[];

  const followedIds = follows
    .map((f) => f.followingId)
    .filter(Boolean);

  const allowedUserIds = [
    new mongoose.Types.ObjectId(userId),
    ...followedIds,
  ];

  const stories = await Story.find({
    expiresAt: { $gt: new Date() },
    userId: { $in: allowedUserIds },
  })
    .populate("userId", "name email image avatar")
    .sort({ createdAt: -1 })
    .lean<PopulatedStoryRow[]>();

  const normalized = stories.map((story) => {
    const storyUser = isPopulatedStoryUser(story.userId) ? story.userId : null;
    const storyUserId = storyUser?._id?.toString() ?? story.userId?.toString();

    return {
      _id: story._id.toString(),
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      isMine: storyUserId === userId,
      seen: story.viewers?.some((viewerId) => viewerId.toString() === userId),
      username:
        storyUser?.name ??
        storyUser?.email?.split?.("@")?.[0] ??
        "Unknown",
      userAvatar: storyUser?.image ?? storyUser?.avatar ?? "",
      ...(storyUserId === userId
        ? { viewerCount: countNonOwnerViewers(story, storyUserId) }
        : {}),
    };
  });

  return NextResponse.json(normalized);
}
