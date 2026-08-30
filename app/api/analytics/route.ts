import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import {
  getEarningsSettings,
  getOpenCycle,
  getOrCreateWallet,
  paiseToRupees,
  publicWithdrawal,
} from "@/app/lib/earnings";
import Post from "@/app/models/Post";
import Withdrawal from "@/app/models/Withdrawal";
import {
  estimateForCreator,
  creatorRevenueHistory,
} from "@/app/lib/creator-revenue/service";

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

export async function GET() {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userObjectId = new Types.ObjectId(userId);
    const settings = await getEarningsSettings();
    const wallet = await getOrCreateWallet(userObjectId);
    const cycle = await getOpenCycle(userObjectId);

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

    let creatorRevenue = null;
    try {
      const [estimate, history] = await Promise.all([
        estimateForCreator(userObjectId),
        creatorRevenueHistory(userObjectId),
      ]);
      creatorRevenue = {
        cycle: estimate.cycle
          ? {
              id: estimate.cycle._id.toString(),
              label: estimate.cycle.label,
              status: estimate.cycle.status,
              poolAmount: estimate.cycle.revenuePoolPaise || estimate.cycle.estimatedPoolPaise,
            }
          : null,
        estimate: estimate.estimate,
        history,
      };
    } catch (error) {
      console.error("CREATOR REVENUE LOOKUP ERROR:", error);
    }

    const videos = videoPosts.map((post, index) => {
      const likes = post.likeCount ?? 0;
      const earnings = paiseToRupees(likes * settings.likeRatePaise);
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
      ratePerLike: paiseToRupees(settings.likeRatePaise),
      minimumAmountToWithdraw: paiseToRupees(settings.minimumWithdrawalPaise),
      maximumAmountToWithdraw: settings.maximumWithdrawalPaise
        ? paiseToRupees(settings.maximumWithdrawalPaise)
        : null,
      withdrawalsEnabled: settings.withdrawalsEnabled && !settings.maintenanceMode,
      creatorRevenue,
      wallet: {
        availableBalance: paiseToRupees(wallet.availableBalancePaise),
        totalEarned: paiseToRupees(wallet.totalEarnedPaise),
        totalWithdrawn: paiseToRupees(wallet.totalWithdrawnPaise),
      },
      currentCycle: {
        id: cycle._id.toString(),
        eligibleLikes: cycle.eligibleLikes,
        earnedAmount: paiseToRupees(cycle.earnedAmountPaise),
        status: cycle.status,
      },
      lifetimeLikes: totalLikes,
      totalLikes,
      totalEarnings: paiseToRupees(wallet.totalEarnedPaise),
      totalVideos: videos.length,
      totalContent: posts.length,
      topVideo,
      videos,
      withdrawals: (await Withdrawal.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()).map(publicWithdrawal),
    });
  } catch (error) {
    console.error("USER ANALYTICS ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load analytics" },
      { status: 500 }
    );
  }
}
