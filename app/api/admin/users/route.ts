import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import Post from "@/app/models/Post";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const VIDEO_URL_RE = /\.(mp4|webm|mov|m4v|avi|mkv)(?:\?|#|$)/i;

const ALLOWED_FILTERS = new Set([
  "all",
  "active",
  "suspended",
  "banned",
  "verified",
  "unverified",
  "premium",
  "regular",
]);

const ALLOWED_SORTS = new Set([
  "createdAt",
  "createdAtAsc",
  "updatedAt",
  "name",
  "followers",
]);

const SORT_SPECS: Record<string, Record<string, 1 | -1>> = {
  createdAt: { createdAt: -1 },
  createdAtAsc: { createdAt: 1 },
  updatedAt: { updatedAt: -1 },
  name: { name: 1 },
  followers: { followersCount: -1 },
};

const USER_PAGE_PROJECT = {
  _id: 1,
  name: 1,
  email: 1,
  image: 1,
  avatar: 1,
  provider: 1,
  role: 1,
  accountStatus: 1,
  accountStatusReason: 1,
  accountStatusAt: 1,
  verified: 1,
  verifiedAt: 1,
  createdAt: 1,
  updatedAt: 1,
  lastSeen: 1,
  _status: 1,
  _verified: 1,
  _premiumNow: 1,
  followersCount: 1,
  followingCount: 1,
} as const;

type StatusBucket = { _id: string; n: number };

function handleFromName(name?: string | null) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

type PostCounts = {
  total: number;
  active: number;
  removed: number;
  videos: number;
};

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") || "all";

  if (!ALLOWED_FILTERS.has(status)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const sort = searchParams.get("sort") || "createdAt";
  if (!ALLOWED_SORTS.has(sort)) {
    return NextResponse.json({ error: "Invalid sort option" }, { status: 400 });
  }

  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );

  try {
    await dbConnect();

    const baseMatch: Record<string, unknown> = { isAI: { $ne: true } };
    if (q) {
      baseMatch.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const FILTER_MATCH: Record<string, Record<string, unknown>> = {
      active: { _status: "active" },
      suspended: { _status: "suspended" },
      banned: { _status: "banned" },
      verified: { _verified: true },
      unverified: { _verified: false },
      premium: { _premiumNow: true },
      regular: { _premiumNow: false },
    };
    const statusMatch = status === "all" ? {} : FILTER_MATCH[status] ?? {};

    const facet = await User.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          _status: { $ifNull: ["$accountStatus", "active"] },
          _verified: { $ifNull: ["$verified", false] },
          _premiumNow: {
            $and: [
              { $eq: ["$isPremium", true] },
              {
                $or: [
                  { $eq: ["$premiumExpiresAt", null] },
                  { $gt: ["$premiumExpiresAt", new Date()] },
                ],
              },
            ],
          },
          followersCount: { $size: { $ifNull: ["$followers", []] } },
          followingCount: { $size: { $ifNull: ["$following", []] } },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: { _id: "$_status", n: { $sum: 1 } },
            },
          ],
          verified: [{ $match: { _verified: true } }, { $count: "n" }],
          premium: [{ $match: { _premiumNow: true } }, { $count: "n" }],
          users: [
            { $match: statusMatch },
            { $sort: SORT_SPECS[sort] },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: USER_PAGE_PROJECT },
          ],
          total: [{ $match: statusMatch }, { $count: "n" }],
        },
      },
    ]);

    const facetDoc = facet[0];
    const bucketMap: Record<string, number> = {};
    for (const b of (facetDoc.summary as StatusBucket[]) ?? []) {
      bucketMap[b._id] = b.n ?? 0;
    }

    const totalBase = Object.values(bucketMap).reduce((sum, n) => sum + n, 0);
    const verifiedCount = facetDoc.verified?.[0]?.n ?? 0;
    const premiumCount = facetDoc.premium?.[0]?.n ?? 0;

    const summary = {
      total: totalBase,
      active: bucketMap.active ?? 0,
      warned: bucketMap.warned ?? 0,
      restricted: bucketMap.restricted ?? 0,
      banned: bucketMap.banned ?? 0,
      suspended: bucketMap.suspended ?? 0,
      verified: verifiedCount,
      unverified: totalBase - verifiedCount,
      premium: premiumCount,
      regular: totalBase - premiumCount,
    };

    const users = (facetDoc.users as Array<Record<string, unknown>>) ?? [];
    const ids = users
      .filter((u) => mongoose.Types.ObjectId.isValid(String(u._id)))
      .map((u) => new mongoose.Types.ObjectId(String(u._id)));

    const zero: PostCounts = { total: 0, active: 0, removed: 0, videos: 0 };
    const postCounts = new Map<string, PostCounts>();

    if (ids.length > 0) {
      const rows = await Post.aggregate([
        { $match: { userId: { $in: ids } } },
        {
          $project: {
            userId: 1,
            status: { $ifNull: ["$status", "active"] },
            isVideo: {
              $anyElementTrue: {
                $map: {
                  input: { $ifNull: ["$images", []] },
                  as: "img",
                  in: {
                    $regexMatch: {
                      input: "$$img",
                      regex: VIDEO_URL_RE.source,
                      options: "i",
                    },
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: "$userId",
            total: { $sum: 1 },
            removed: { $sum: { $cond: [{ $eq: ["$status", "removed"] }, 1, 0] } },
            videos: { $sum: { $cond: ["$isVideo", 1, 0] } },
          },
        },
      ]);
      for (const row of rows) {
        const uid = String(row._id);
        postCounts.set(uid, {
          total: row.total ?? 0,
          active: (row.total ?? 0) - (row.removed ?? 0),
          removed: row.removed ?? 0,
          videos: row.videos ?? 0,
        });
      }
    }

    const total = facetDoc.total?.[0]?.n ?? 0;

    return NextResponse.json({
      users: users.map((u) => ({
        id: String(u._id),
        name: String(u.name ?? ""),
        email: String(u.email ?? ""),
        handle: handleFromName(u.name as string | null),
        avatar: String(u.avatar || u.image || ""),
        provider: String(u.provider ?? "credentials"),
        role: u.role === "ADMIN" ? "ADMIN" : "USER",
        accountStatus: String(u._status),
        accountStatusReason: String(u.accountStatusReason ?? ""),
        accountStatusAt: u.accountStatusAt ?? null,
        verified: u._verified === true,
        verifiedAt: u.verifiedAt ?? null,
        isPremium: u._premiumNow === true,
        premiumExpiresAt: u.premiumExpiresAt ?? null,
        counts: {
          ...(postCounts.get(String(u._id)) ?? zero),
          followers: u.followersCount ?? 0,
          following: u.followingCount ?? 0,
        },
        createdAt: u.createdAt ?? null,
        updatedAt: u.updatedAt ?? null,
        lastSeen: u.lastSeen ?? null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary,
    });
  } catch (error) {
    console.error("ADMIN USERS LIST ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}