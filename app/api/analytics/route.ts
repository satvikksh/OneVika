import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import Post from "@/app/models/Post";

const PER_LIKE_RATE = 0.05;

type UserPostAnalyticsRow = {
  _id: Types.ObjectId;
  content?: string;
  images?: string[];
  likeCount?: number;
  createdAt?: Date;
};

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|avi|mkv)(?:\?|#|$)/i.test(url);
}

function titleFromPost(post: UserPostAnalyticsRow, index: number) {
  const content = typeof post.content === "string" ? post.content.trim() : "";
  if (content) return content.length > 80 ? `${content.slice(0, 77)}...` : content;
  return `Video ${index + 1}`;
}

function toMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function GET() {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userObjectId = new Types.ObjectId(userId);

    const posts = await Post.aggregate<UserPostAnalyticsRow>([
      { $match: { userId: userObjectId } },
      {
        $project: {
          content: 1,
          images: { $ifNull: ["$images", []] },
          createdAt: 1,
          likeCount: { $size: { $ifNull: ["$likes", []] } },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    const totalLikes = posts.reduce((sum, post) => sum + (post.likeCount ?? 0), 0);
    const videoPosts = posts.filter((post) => (post.images ?? []).some(isVideoUrl));

    const videos = videoPosts.map((post, index) => {
      const likes = post.likeCount ?? 0;
      const earnings = toMoney(likes * PER_LIKE_RATE);
      const videoUrl = (post.images ?? []).find(isVideoUrl) ?? "";

      return {
        id: post._id.toString(),
        title: titleFromPost(post, index),
        likes,
        earnings,
        videoUrl,
        createdAt: post.createdAt?.toISOString?.() ?? null,
      };
    });

    const topVideo =
      videos.length > 0
        ? videos.reduce((top, video) => (video.likes > top.likes ? video : top), videos[0])
        : null;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      ratePerLike: PER_LIKE_RATE,
      totalLikes,
      totalEarnings: toMoney(totalLikes * PER_LIKE_RATE),
      totalVideos: videos.length,
      totalContent: posts.length,
      topVideo,
      videos,
    });
  } catch (error) {
    console.error("USER ANALYTICS ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load analytics" },
      { status: 500 }
    );
  }
}
