import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { dbConnect } from "../../../../lib/mongodb";
import { authOptions } from "../../../../lib/authOptions";
import Story from "../../../../models/Story";
import User from "../../../../models/User";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 60;

type ViewerDetailRow = {
  viewerId: mongoose.Types.ObjectId;
  viewerName?: string;
  viewerUsername?: string;
  viewerProfilePicture?: string;
  viewedAt?: Date;
};

type UserSnapshot = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  image?: string;
  avatar?: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid story id" }, { status: 400 });
  }

  const story = await Story.findById(id)
    .select("userId viewers viewerDetails")
    .lean<{
      userId: mongoose.Types.ObjectId;
      viewers?: mongoose.Types.ObjectId[];
      viewerDetails?: ViewerDetailRow[];
    } | null>();

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  if (story.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ownerId = story.userId.toString();
  const detailByViewerId = new Map<string, ViewerDetailRow>();

  for (const detail of story.viewerDetails ?? []) {
    const viewerId = detail.viewerId?.toString();
    if (!viewerId || viewerId === ownerId) continue;

    const existing = detailByViewerId.get(viewerId);
    if (
      !existing ||
      new Date(detail.viewedAt ?? 0).getTime() >
        new Date(existing.viewedAt ?? 0).getTime()
    ) {
      detailByViewerId.set(viewerId, detail);
    }
  }

  for (const viewerId of story.viewers ?? []) {
    const viewerIdText = viewerId.toString();
    if (!viewerIdText || viewerIdText === ownerId || detailByViewerId.has(viewerIdText)) {
      continue;
    }

    detailByViewerId.set(viewerIdText, {
      viewerId,
      viewedAt: new Date(0),
    });
  }

  const viewerIds = Array.from(detailByViewerId.keys());
  const users = viewerIds.length
    ? await User.find({ _id: { $in: viewerIds.map((viewerId) => new mongoose.Types.ObjectId(viewerId)) } })
        .select("name email image avatar")
        .lean<UserSnapshot[]>()
    : [];

  const userById = new Map(users.map((user) => [user._id.toString(), user]));
  const normalizedViewers = viewerIds
    .map((viewerId) => {
      const detail = detailByViewerId.get(viewerId);
      const user = userById.get(viewerId);
      const viewerName = detail?.viewerName || user?.name || "Unknown";
      const viewerUsername =
        detail?.viewerUsername ||
        user?.email?.split("@")[0] ||
        viewerName;

      return {
        viewerId,
        viewerName,
        viewerUsername,
        viewerProfilePicture:
          detail?.viewerProfilePicture || user?.image || user?.avatar || "",
        viewedAt: detail?.viewedAt ?? new Date(0),
      };
    })
    .sort(
      (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
    );

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const start = (page - 1) * limit;
  const pageViewers = normalizedViewers.slice(start, start + limit);

  return NextResponse.json({
    total: normalizedViewers.length,
    page,
    limit,
    hasMore: start + limit < normalizedViewers.length,
    viewers: pageViewers,
  });
}
