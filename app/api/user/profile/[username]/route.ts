import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { dbConnect } from "../../../../lib/mongodb";
import User from "../../../../models/User";
import Post from "../../../../models/Post";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/authOptions";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  await dbConnect();

  // 🔑 params MUST be awaited in Next 16
  const { username } = await context.params;

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  const user = await User.findOne({ username }).lean();

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // 👇 TS-safe access
  const u = user as any;

  const followersCount = Array.isArray(u.followers)
    ? u.followers.length
    : 0;

  const followingCount = Array.isArray(u.following)
    ? u.following.length
    : 0;

  const isFollowing =
    currentUserId &&
    Array.isArray(u.followers) &&
    u.followers.some(
      (id: any) => id.toString() === currentUserId
    );

  const posts = await Post.find({ userId: u._id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    user: {
      ...u,
      followersCount,
      followingCount,
      isFollowing,
    },
    posts,
  });
}
