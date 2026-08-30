import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import Post from "@/app/models/Post";
import Report from "@/app/models/Report";
import User from "@/app/models/User";

const VIDEO_REGEX_SRC = "\\.(mp4|webm|mov|m4v|avi|mkv)(\\?|#|$)";

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  likes: { likeCount: -1 },
  comments: { commentCount: -1 },
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

type CreatorDoc = {
  _id: { toString: () => string };
  name?: string;
  email?: string;
  image?: string;
  avatar?: string;
  accountStatus?: string;
  isPremium?: boolean;
  createdAt?: Date;
};

export async function GET(req: Request) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const sortKey = searchParams.get("sort") || "newest";
    const page = cleanInt(searchParams.get("page"), 1, 1, 1_000_000);
    const limit = cleanInt(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const search = (searchParams.get("search") || "").trim();

    const match: Record<string, unknown> = {};
    if (status === "active" || status === "removed") {
      match.status = status === "removed" ? "removed" : { $ne: "removed" };
    }
    if (type === "video" || type === "post") {
      if (type === "video") {
        match.images = { $regex: VIDEO_REGEX_SRC, $options: "i" };
      } else {
        match.images = { $not: { $regex: VIDEO_REGEX_SRC, $options: "i" } };
      }
    }

    const searchMatch =
      search.length > 0
        ? await buildSearchMatch(search)
        : {};

    const combined = { ...match, ...searchMatch };

    const [rawCount] = await Post.aggregate<{ total: number }>([
      { $match: combined },
      { $count: "total" },
    ]);
    const total = rawCount?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const sortObj = SORTS[sortKey] ??
      SORTS.newest as Record<string, 1 | -1>;

    const rawPosts = await Post.aggregate([
      { $match: combined },
      {
        $addFields: {
          likeCount: { $size: { $ifNull: ["$likes", []] } },
          commentCount: { $size: { $ifNull: ["$comments", []] } },
        },
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "creator",
        },
      },
      {
        $lookup: {
          from: "reports",
          let: { contentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$contentId", "$$contentId"] } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                open: {
                  $sum: {
                    $cond: [
                      { $in: ["$status", ["PENDING", "REVIEWING"]] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: "reportStats",
        },
      },
      {
        $unwind: {
          path: "$reportStats",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          images: 1,
          status: 1,
          likeCount: 1,
          commentCount: 1,
          reportCount: { $ifNull: ["$reportStats.count", 0] },
          openReportCount: { $ifNull: ["$reportStats.open", 0] },
          createdAt: 1,
          updatedAt: 1,
          removedAt: 1,
          removalReason: 1,
          creator: { $arrayElemAt: ["$creator", 0] },
        },
      },
    ]);

    const posts = rawPosts.map((post) => {
      const creator = post.creator as unknown as CreatorDoc | undefined;
      const images = Array.isArray(post.images) ? post.images : [];
      const isVideo = images.some((url) =>
        new RegExp(VIDEO_REGEX_SRC, "i").test(String(url))
      );
      return {
        id: String(post._id),
        contentType: isVideo ? "video" : "post",
        isVideo,
        content: String(post.content || ""),
        images,
        status: String(post.status || "active"),
        likeCount: Number(post.likeCount || 0),
        commentCount: Number(post.commentCount || 0),
        reportCount: Number(post.reportCount || 0),
        openReportCount: Number(post.openReportCount || 0),
        removedAt: post.removedAt?.toISOString?.() ?? null,
        removalReason: String(post.removalReason || ""),
        createdAt: post.createdAt?.toISOString?.() ?? null,
        updatedAt: post.updatedAt?.toISOString?.() ?? null,
        creator: creator
          ? {
              id: String(creator._id),
              name: creator.name || "Unknown",
              email: creator.email || "",
              image: creator.image || creator.avatar || "",
              accountStatus: creator.accountStatus || "active",
              isPremium: Boolean(creator.isPremium),
              createdAt: creator.createdAt?.toISOString?.() ?? null,
            }
          : null,
      };
    });

    const [summaryRow] = await Post.aggregate([
      {
        $facet: {
          all: [{ $count: "n" }],
          videos: [
            { $match: { images: { $regex: VIDEO_REGEX_SRC, $options: "i" } } },
            { $count: "n" },
          ],
          active: [{ $match: { status: { $ne: "removed" } } }, { $count: "n" }],
          removed: [{ $match: { status: "removed" } }, { $count: "n" }],
        },
      },
    ]);

    const [openReports] = await Report.aggregate<{ n: number }>([
      { $match: { status: { $in: ["PENDING", "REVIEWING"] } } },
      { $count: "n" },
    ]);
    const reportedContentIds = await Report.distinct("contentId");

    const totalPosts = summaryRow?.all?.[0]?.n ?? 0;
    const totalVideos = summaryRow?.videos?.[0]?.n ?? 0;

    return NextResponse.json({
      posts,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
      },
      summary: {
        total: totalPosts,
        posts: totalPosts - totalVideos,
        videos: totalVideos,
        active: summaryRow?.active?.[0]?.n ?? 0,
        removed: summaryRow?.removed?.[0]?.n ?? 0,
        reportedContent: reportedContentIds.length,
        openReports: openReports?.n ?? 0,
      },
    });
  } catch (error) {
    console.error("ADMIN POSTS ERROR:", error);
    return NextResponse.json({ error: "Unable to load posts" }, { status: 500 });
  }
}

async function buildSearchMatch(search: string): Promise<Record<string, unknown>> {
  const rx = new RegExp(escapeRegex(search), "i");
  const userMatches = await User.find({
    $or: [{ name: rx }, { email: rx }],
  })
    .select("_id")
    .limit(100)
    .lean();

  const userIds = userMatches.map((user) => user._id as unknown as Types.ObjectId);
  return {
    $or: [
      { content: rx },
      ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
      ...(Types.ObjectId.isValid(search) ? [{ _id: new Types.ObjectId(search) }] : []),
    ],
  };
}