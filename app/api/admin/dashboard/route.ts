import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireAdmin, paiseToRupees } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import AdminAuditLog from "@/app/models/AdminAuditLog";
import CreatorEarningCycle from "@/app/models/CreatorEarningCycle";
import CreatorEarningTransaction from "@/app/models/CreatorEarningTransaction";
import CreatorMetricSnapshot from "@/app/models/CreatorMetricSnapshot";
import CreatorRevenueAllocation from "@/app/models/CreatorRevenueAllocation";
import EarningTransaction from "@/app/models/EarningTransaction";
import Post from "@/app/models/Post";
import Project from "@/app/models/Project";
import Report from "@/app/models/Report";
import User from "@/app/models/User";
import ViewerActivity from "@/app/models/ViewerActivity";
import Wallet from "@/app/models/Wallet";
import Withdrawal from "@/app/models/Withdrawal";

const VIDEO_URL_RE = /(\.(mp4|webm|mov|m4v|avi|mkv)(?:\?|#|$))/i;
const AUDIT_ACTIVITY_RE =
  /^(USER_(SUSPEND|BAN|UNBAN|UNSUSPEND|VERIFY|UNVERIFY|DELETE)|REPORT_|POST_(HIDE|RESTORE)|WITHDRAWAL_|CREATOR_REVENUE_)/;
const WITHDRAWAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REJECTED",
  "CANCELLED",
  "REVERSED",
];

type Granule = "hour" | "day" | "week" | "month";

const RANGES: Record<string, { days: number; label: string; granule: Granule }> = {
  today: { days: 1, label: "Today", granule: "hour" },
  "7d": { days: 7, label: "7 Days", granule: "day" },
  "30d": { days: 30, label: "30 Days", granule: "day" },
  "3m": { days: 92, label: "3 Months", granule: "week" },
  "1y": { days: 366, label: "1 Year", granule: "month" },
};

function idOf(value: unknown) {
  return (value as { toString?: () => string })?.toString?.() ?? String(value);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDay(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoMonth(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type Bucket = { key: string; label: string; start: string; end: string };

function enumerateBuckets(from: Date, to: Date, granule: Granule): Bucket[] {
  const buckets: Bucket[] = [];
  if (granule === "hour") {
    for (let hour = 0; hour <= to.getUTCHours(); hour += 1) {
      const value = String(hour).padStart(2, "0");
      buckets.push({ key: value, label: `${value}:00`, start: value, end: value });
    }
    return buckets;
  }
  if (granule === "month") {
    let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    while (cursor.getTime() <= to.getTime()) {
      const key = isoMonth(cursor);
      const start = isoDay(cursor);
      const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      buckets.push({ key, label: key, start, end: isoDay(next) });
      cursor = next;
    }
    return buckets;
  }
  if (granule === "week") {
    let cursor = startOfUtcDay(from);
    const dow = (cursor.getUTCDay() + 6) % 7;
    cursor = new Date(cursor.getTime() - dow * 24 * 60 * 60 * 1000);
    while (cursor.getTime() <= to.getTime()) {
      const start = isoDay(cursor);
      const next = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
      buckets.push({ key: start, label: start, start, end: isoDay(next) });
      cursor = next;
    }
    return buckets;
  }
  let cursor = startOfUtcDay(from);
  while (cursor.getTime() <= to.getTime()) {
    const key = isoDay(cursor);
    const next = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    buckets.push({ key, label: key, start: key, end: isoDay(next) });
    cursor = next;
  }
  return buckets;
}

function sumInside(
  map: Map<string, number>,
  startKey: string,
  endKey: string,
  granule: Granule
) {
  if (granule === "hour") return map.get(startKey) ?? 0;
  let total = 0;
  for (const [key, value] of map) {
    if (key >= startKey && key < endKey) total += value;
  }
  return total;
}

type WindowSums = { cur: number; prev: number; total: number };

function windowSums(
  map: Map<string, number>,
  buckets: Bucket[],
  granule: Granule,
  curKey: string
): WindowSums {
  let cur = 0;
  let prev = 0;
  let total = 0;
  for (const bucket of buckets) {
    const value = sumInside(map, bucket.start, bucket.end, granule);
    total += value;
    if (granule === "hour" || bucket.start >= curKey) cur += value;
    else prev += value;
  }
  return { cur, prev, total };
}

function buildSeries(
  map: Map<string, number>,
  buckets: Bucket[],
  granule: Granule
) {
  return buckets.map((bucket) => {
    let value = 0;
    if (granule === "hour") value = map.get(bucket.start) ?? 0;
    else {
      for (const [key, amount] of map) {
        if (key >= bucket.start && key < bucket.end) value += amount;
      }
    }
    return { key: bucket.key, label: bucket.label, value };
  });
}

function toPct(cur: number, prev: number): { current: number; previous: number; pct: number | null } {
  if (prev > 0) {
    return { current: cur, previous: prev, pct: ((cur - prev) / prev) * 100 };
  }
  return { current: cur, previous: prev, pct: null };
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const rangeKey = searchParams.get("range") ?? "30d";
    const range = RANGES[rangeKey] ?? RANGES["30d"];
    const granule = range.granule;

    const to = new Date();
    const curStart = startOfUtcDay(new Date(to.getTime() - (range.days - 1) * 24 * 60 * 60 * 1000));
    const prevStart = new Date(curStart.getTime() - range.days * 24 * 60 * 60 * 1000);
    const curKey = isoDay(curStart);

    const fmt = granule === "hour" ? "%H" : "%Y-%m-%d";
    const dateExpr = (field: string) =>
      ({ $dateToString: { format: fmt, date: `$${field}` } }) as unknown;

    const [userFacet, postFacet, projectFacet, reportFacet, earningFacet, releaseFacet, viewerFacet, withdrawalFacet, allocationTotals, walletTotals, cycles, auditLogs] =
      await Promise.all([
        User.aggregate([
          {
            $facet: {
              statuses: [
                { $match: { isAI: { $ne: true } } },
                {
                  $group: {
                    _id: "all",
                    total: { $sum: 1 },
                    followers: { $sum: { $size: { $ifNull: ["$followers", []] } } },
                    verified: { $sum: { $cond: [{ $eq: ["$verified", true] }, 1, 0] } },
                    premium: {
                      $sum: {
                        $cond: [
                          {
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
                          1,
                          0,
                        ],
                      },
                    },
                    suspended: { $sum: { $cond: [{ $eq: ["$accountStatus", "suspended"] }, 1, 0] } },
                    banned: { $sum: { $cond: [{ $eq: ["$accountStatus", "banned"] }, 1, 0] } },
                    warned: { $sum: { $cond: [{ $eq: ["$accountStatus", "warned"] }, 1, 0] } },
                    restricted: { $sum: { $cond: [{ $eq: ["$accountStatus", "restricted"] }, 1, 0] } },
                  },
                },
              ],
              created: [
                { $match: { isAI: { $ne: true }, createdAt: { $gte: prevStart } } },
                { $group: { _id: dateExpr("createdAt"), value: { $sum: 1 } } },
              ],
              active: [
                { $match: { isAI: { $ne: true }, lastSeen: { $gte: prevStart } } },
                { $group: { _id: dateExpr("lastSeen"), value: { $sum: 1 } } },
              ],
              activeCurrent: [
                { $match: { isAI: { $ne: true }, lastSeen: { $gte: curStart } } },
                { $count: "value" },
              ],
              activePrevious: [
                { $match: { isAI: { $ne: true }, lastSeen: { $gte: prevStart, $lt: curStart } } },
                { $count: "value" },
              ],
            },
          },
        ]),
        Post.aggregate([
          {
            $facet: {
              totals: [
                {
                  $project: {
                    status: 1,
                    isVideo: {
                      $anyElementTrue: {
                        $map: {
                          input: { $ifNull: ["$images", []] },
                          as: "img",
                          in: { $regexMatch: { input: "$$img", regex: VIDEO_URL_RE.source, options: "i" } },
                        },
                      },
                    },
                    likeCount: { $size: { $ifNull: ["$likes", []] } },
                    commentCount: { $size: { $ifNull: ["$comments", []] } },
                  },
                },
                {
                  $group: {
                    _id: "all",
                    total: { $sum: 1 },
                    removed: { $sum: { $cond: [{ $eq: ["$status", "removed"] }, 1, 0] } },
                    videos: { $sum: { $cond: ["$isVideo", 1, 0] } },
                    likes: { $sum: "$likeCount" },
                    comments: { $sum: "$commentCount" },
                  },
                },
              ],
              created: [
                { $match: { createdAt: { $gte: prevStart } } },
                {
                  $project: {
                    isVideo: {
                      $anyElementTrue: {
                        $map: {
                          input: { $ifNull: ["$images", []] },
                          as: "img",
                          in: { $regexMatch: { input: "$$img", regex: VIDEO_URL_RE.source, options: "i" } },
                        },
                      },
                    },
                  },
                },
                {
                  $group: {
                    _id: { date: dateExpr("createdAt"), isVideo: "$isVideo" },
                    value: { $sum: 1 },
                  },
                },
              ],
              comments: [
                { $match: { createdAt: { $gte: prevStart }, "comments.0": { $exists: true } } },
                { $unwind: "$comments" },
                { $match: { "comments.createdAt": { $gte: prevStart } } },
                {
                  $group: {
                    _id: { $dateToString: { format: fmt, date: "$comments.createdAt" } },
                    value: { $sum: 1 },
                  },
                },
              ],
              topContent: [
                { $match: { status: "active" } },
                {
                  $project: {
                    content: { $substrBytes: [{ $ifNull: ["$content", ""] }, 0, 60] },
                    authorId: "$userId",
                    likes: { $size: { $ifNull: ["$likes", []] } },
                    comments: { $size: { $ifNull: ["$comments", []] } },
                    createdAt: 1,
                  },
                },
                {
                  $addFields: {
                    engagement: { $add: ["$likes", "$comments"] },
                  },
                },
                { $sort: { engagement: -1 } },
                { $limit: 5 },
              ],
            },
          },
        ]),
        Project.aggregate([
          {
            $facet: {
              totals: [{ $count: "total" }],
              created: [
                { $match: { createdAt: { $gte: prevStart } } },
                { $group: { _id: dateExpr("createdAt"), value: { $sum: 1 } } },
              ],
            },
          },
        ]),
        Report.aggregate([
          {
            $facet: {
              byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
              created: [
                { $match: { createdAt: { $gte: prevStart } } },
                { $group: { _id: dateExpr("createdAt"), value: { $sum: 1 } } },
              ],
            },
          },
        ]),
        EarningTransaction.aggregate([
          {
            $facet: {
              totals: [
                { $match: { type: "EARNING", status: "COMPLETED" } },
                { $group: { _id: null, paise: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
              ],
              series: [
                { $match: { type: "EARNING", status: "COMPLETED", createdAt: { $gte: prevStart } } },
                {
                  $group: {
                    _id: dateExpr("createdAt"),
                    paise: { $sum: "$amountPaise" },
                    count: { $sum: 1 },
                  },
                },
              ],
            },
          },
        ]),
        CreatorEarningTransaction.aggregate([
          {
            $facet: {
              totals: [
                { $match: { type: "RELEASE", status: "COMPLETED" } },
                { $group: { _id: null, paise: { $sum: "$amountPaise" } } },
              ],
              series: [
                { $match: { type: "RELEASE", status: "COMPLETED", createdAt: { $gte: prevStart } } },
                {
                  $group: {
                    _id: dateExpr("createdAt"),
                    paise: { $sum: "$amountPaise" },
                  },
                },
              ],
            },
          },
        ]),
        ViewerActivity.aggregate([
          { $match: { day: { $gte: prevStart } } },
          {
            $group: {
              _id: { $dateToString: { format: fmt, date: "$day" } },
              shares: { $sum: { $add: [{ $ifNull: ["$shares", 0] }, { $ifNull: ["$qualifiedShares", 0] }] } },
            },
          },
        ]),
        Withdrawal.aggregate([
          {
            $facet: {
              byStatus: [
                { $group: { _id: "$status", count: { $sum: 1 }, paise: { $sum: "$amountPaise" } } },
              ],
              completed: [
                {
                  $match: {
                    status: "COMPLETED",
                    $expr: { $gte: [{ $ifNull: ["$completedAt", "$createdAt"] }, prevStart] },
                  },
                },
                {
                  $group: {
                    _id: {
                      $dateToString: {
                        format: fmt,
                        date: { $ifNull: ["$completedAt", "$createdAt"] },
                      },
                    },
                    paise: { $sum: "$amountPaise" },
                  },
                },
              ],
            },
          },
        ]),
        CreatorRevenueAllocation.aggregate([
          { $group: { _id: null, paise: { $sum: { $ifNull: ["$finalRevenuePaise", 0] } } } },
        ]),
        Wallet.aggregate([
          {
            $group: {
              _id: null,
              available: { $sum: { $ifNull: ["$availableBalancePaise", 0] } },
              earned: { $sum: { $ifNull: ["$totalEarnedPaise", 0] } },
              withdrawn: { $sum: { $ifNull: ["$totalWithdrawnPaise", 0] } },
            },
          },
        ]),
        CreatorEarningCycle.find({}).sort({ startDate: -1 }).limit(60).lean(),
        AdminAuditLog.find({})
          .sort({ createdAt: -1 })
          .limit(40)
          .select("action targetId adminId description createdAt")
          .lean(),
      ]);

    // ---------- helpers ----------
    const facetDoc = <T,>(doc: T[] | undefined): T | undefined =>
      Array.isArray(doc) && doc.length > 0 ? doc[0] : undefined;

    // ---------- users ----------
    const userDoc = facetDoc(userFacet);
    const statuses = facetDoc<Record<string, number>>(userDoc?.statuses) ?? {};
    const usersCreatedRaw = (userDoc?.created ?? []) as Array<{ _id: string; value: number }>;
    const usersActiveRaw = (userDoc?.active ?? []) as Array<{ _id: string; value: number }>;
    const activeCurrent = facetDoc<{ value: number }>(userDoc?.activeCurrent)?.value ?? 0;
    const activePrevious = facetDoc<{ value: number }>(userDoc?.activePrevious)?.value ?? 0;

    const usersCreatedMap = new Map(usersCreatedRaw.map((row) => [row._id, row.value]));
    const usersActiveMap = new Map(usersActiveRaw.map((row) => [row._id, row.value]));

    // ---------- posts / projects / reports ----------
    const postDoc = facetDoc(postFacet);
    const postTotals = facetDoc<Record<string, number>>(postDoc?.totals) ?? {};
    const postCreated = (postDoc?.created ?? []) as Array<{ _id: { date: string; isVideo: boolean }; value: number }>;
    const commentsRaw = (postDoc?.comments ?? []) as Array<{ _id: string; value: number }>;
    const topContentRaw = (postDoc?.topContent ?? []) as Array<Record<string, unknown>>;

    const postsMap = new Map<string, { posts: number; videos: number }>();
    for (const row of postCreated) {
      const entry = postsMap.get(row._id.date) ?? { posts: 0, videos: 0 };
      entry.posts += row.value;
      if (row._id.isVideo) entry.videos += row.value;
      postsMap.set(row._id.date, entry);
    }
    const postsCountMap = new Map<string, number>();
    const videosCountMap = new Map<string, number>();
    for (const [key, entry] of postsMap) {
      postsCountMap.set(key, entry.posts);
      videosCountMap.set(key, entry.videos);
    }
    const commentsMap = new Map(commentsRaw.map((row) => [row._id, row.value]));

    const projectDoc = facetDoc(projectFacet);
    const projectTotal = facetDoc<{ total: number }>(projectDoc?.totals)?.total ?? 0;
    const projectMap = new Map(
      ((projectDoc?.created ?? []) as Array<{ _id: string; value: number }>).map((row) => [row._id, row.value])
    );

    const reportDoc = facetDoc(reportFacet);
    const reportStatusRows = (reportDoc?.byStatus ?? []) as Array<{ _id: string; count: number }>;
    const reportStatusMap = new Map(reportStatusRows.map((row) => [row._id, row.count]));
    const reportTotal = reportStatusRows.reduce((sum, row) => sum + (row.count ?? 0), 0);
    const reportMap = new Map(
      ((reportDoc?.created ?? []) as Array<{ _id: string; value: number }>).map((row) => [row._id, row.value])
    );

    // ---------- earnings / revenue / shares / withdrawals ----------
    const earningDoc = facetDoc(earningFacet);
    const earningTotals = facetDoc<{ paise: number; count: number }>(earningDoc?.totals) ?? { paise: 0, count: 0 };
    const earningSeries = (earningDoc?.series ?? []) as Array<{ _id: string; paise: number; count: number }>;

    const releaseDoc = facetDoc(releaseFacet);
    const releaseTotals = facetDoc<{ paise: number }>(releaseDoc?.totals) ?? { paise: 0 };
    const releaseSeries = (releaseDoc?.series ?? []) as Array<{ _id: string; paise: number }>;

    const viewerShares = viewerFacet as Array<{ _id: string; shares: number }>;
    const sharesMap = new Map(viewerShares.map((row) => [row._id, row.shares]));

    const withdrawalDoc = facetDoc(withdrawalFacet);
    const withdrawalStatusRows = (withdrawalDoc?.byStatus ?? []) as Array<{ _id: string; count: number; paise: number }>;
    const withdrawalStatusMap = new Map(withdrawalStatusRows.map((row) => [row._id, row]));
    const withdrawalCompletedRaw = (withdrawalDoc?.completed ?? []) as Array<{ _id: string; paise: number }>;
    const withdrawalCompletedMap = new Map(withdrawalCompletedRaw.map((row) => [row._id, row.paise]));

    const earningTotalPaise = earningTotals.paise ?? 0;
    const releaseTotalPaise = releaseTotals.paise ?? 0;
    const allocatedTotalPaise = facetDoc<{ paise: number }>(allocationTotals)?.paise ?? 0;
    const walletTotalsDoc = facetDoc<{ available: number; earned: number; withdrawn: number }>(walletTotals) ?? {
      available: 0,
      earned: 0,
      withdrawn: 0,
    };

    // ---------- creator-cycle status ----------
    const cyclesDoc = cycles as unknown as Array<Record<string, unknown>>;
    const activeCycle = cyclesDoc.find((cycle) => cycle.status === "OPEN") ?? cyclesDoc[0] ?? null;
    const activeCycleId = activeCycle?._id ? idOf(activeCycle._id) : null;
    const poolPaise = Number(activeCycle?.revenuePoolPaise || activeCycle?.estimatedPoolPaise || 0);
    const estimatedPoolPaise = Number(activeCycle?.estimatedPoolPaise || 0);

    // ---------- bucket windows ----------
    const buckets = enumerateBuckets(prevStart, to, granule);
    const seriesBuckets = buckets;

    const usersNewWindow = windowSums(usersCreatedMap, seriesBuckets, granule, curKey);
    const postsWindow = windowSums(postsCountMap, seriesBuckets, granule, curKey);
    const videosWindow = windowSums(videosCountMap, seriesBuckets, granule, curKey);
    const projectsWindow = windowSums(projectMap, seriesBuckets, granule, curKey);
    const commentsWindow = windowSums(commentsMap, seriesBuckets, granule, curKey);
    const reportsWindow = windowSums(reportMap, seriesBuckets, granule, curKey);

    const likesMap = new Map(earningSeries.map((row) => [row._id, row.count ?? 0]));
    const revenueMap = new Map<string, number>();
    for (const row of earningSeries) revenueMap.set(row._id, (revenueMap.get(row._id) ?? 0) + (row.paise ?? 0));
    for (const row of releaseSeries) revenueMap.set(row._id, (revenueMap.get(row._id) ?? 0) + (row.paise ?? 0));
    const likesWindow = windowSums(likesMap, seriesBuckets, granule, curKey);
    const revenueWindow = windowSums(revenueMap, seriesBuckets, granule, curKey);
    const withdrawalsWindow = windowSums(withdrawalCompletedMap, seriesBuckets, granule, curKey);

    const sharesWindow = windowSums(sharesMap, seriesBuckets, granule, curKey);
    const engagementNow = likesWindow.cur + commentsWindow.cur + sharesWindow.cur;
    const engagementPrev = likesWindow.prev + commentsWindow.prev + sharesWindow.prev;

    const change = (window: WindowSums) => toPct(window.cur, window.prev);

    // ---------- cards ----------
    const cardUsers = statuses.total ?? 0;
    const newUsers = usersNewWindow.cur;
    const newUsersPrev = usersNewWindow.prev;
    const newPosts = postsWindow.cur;
    const newPostsPrev = postsWindow.prev;
    const newVideos = videosWindow.cur;
    const newVideosPrev = videosWindow.prev;
    const newProjects = projectsWindow.cur;

    const suspendedUsers = statuses.suspended ?? 0;
    const bannedUsers = statuses.banned ?? 0;
    const premiumUsers = statuses.premium ?? 0;
    const verifiedUsers = statuses.verified ?? 0;
    const totalFollowers = statuses.followers ?? 0;

    const totalPosts = postTotals.total ?? 0;
    const removedPosts = postTotals.removed ?? 0;
    const totalVideos = postTotals.videos ?? 0;
    const totalLikes = postTotals.likes ?? 0;
    const totalComments = postTotals.comments ?? 0;
    const totalShares = viewerShares.reduce((sum, row) => sum + (row.shares ?? 0), 0);

    const pendingPayoutStatuses = ["PENDING", "APPROVED", "PROCESSING"];
    const withdrawStatus = (status: string) => withdrawalStatusMap.get(status);
    const completedWithdrawnPaise = withdrawStatus("COMPLETED")?.paise ?? 0;
    const completedWithdrawnCount = withdrawStatus("COMPLETED")?.count ?? 0;
    const pendingPayoutPaise = pendingPayoutStatuses.reduce((sum, status) => sum + (withdrawStatus(status)?.paise ?? 0), 0);

    const platformRevenue = paiseToRupees(earningTotalPaise + releaseTotalPaise);
    const creatorPool = paiseToRupees(poolPaise);
    const creatorEarningsTotal = paiseToRupees(allocatedTotalPaise);
    const availableBalance = paiseToRupees(walletTotalsDoc.available);
    const withdrawnTotal = paiseToRupees(completedWithdrawnPaise);
    const pendingPayouts = paiseToRupees(pendingPayoutPaise);

    // ---------- series ----------
    const seriesUsers = buildSeries(usersCreatedMap, seriesBuckets, granule);
    const seriesActive = buildSeries(usersActiveMap, seriesBuckets, granule);
    const contentSeries = seriesBuckets.map((bucket) => ({
      key: bucket.label,
      posts: postsMap.get(bucket.start)?.posts ?? 0,
      videos: postsMap.get(bucket.start)?.videos ?? 0,
    }));
    const moneySeries = (map: Map<string, number>) =>
      buildSeries(map, seriesBuckets, granule).map((point) => ({ ...point, value: paiseToRupees(point.value) }));
    const seriesProjects = buildSeries(projectMap, seriesBuckets, granule);
    const seriesLikes = buildSeries(likesMap, seriesBuckets, granule);
    const seriesComments = buildSeries(commentsMap, seriesBuckets, granule);
    const seriesShares = buildSeries(sharesMap, seriesBuckets, granule);
    const seriesRevenue = moneySeries(revenueMap);
    const seriesCreator = moneySeries(new Map(releaseSeries.map((row) => [row._id, row.paise])));
    const seriesWithdrawals = moneySeries(withdrawalCompletedMap);
    const seriesReports = buildSeries(reportMap, seriesBuckets, granule);

    // ---------- creator leaders (latest cycle snapshots) ----------
    let topCreators: Record<string, Array<Record<string, unknown>>> = { byScore: [], byViews: [], byEngagement: [] };
    if (activeCycleId) {
      const snapshots = await CreatorMetricSnapshot.find({ cycleId: activeCycleId }).lean();
      if (snapshots.length > 0) {
        const creatorIds = snapshots.map((snapshot) => idOf(snapshot.creatorId));
        const creatorDocs = await User.find({ _id: { $in: creatorIds } }).select("name avatar").lean();
        const nameMap = new Map(creatorDocs.map((user) => [idOf(user._id), user]));
        const deco = snapshots.map((snapshot) => ({
          creatorId: idOf(snapshot.creatorId),
          name: nameMap.get(idOf(snapshot.creatorId))?.name ?? "Unknown creator",
          avatar: nameMap.get(idOf(snapshot.creatorId))?.avatar ?? "",
          score: snapshot.score ?? 0,
          qualifiedViews: snapshot.qualifiedViews ?? 0,
          engagement:
            (snapshot.meaningfulComments ?? 0) +
            (snapshot.qualifiedShares ?? 0) +
            (snapshot.qualifiedFollows ?? 0) +
            (snapshot.qualifiedLikes ?? 0),
          revenuePaise: snapshot.revenuePaise ?? 0,
        }));
        topCreators = {
          byScore: [...deco].sort((a, b) => b.score - a.score).slice(0, 5),
          byViews: [...deco].sort((a, b) => b.qualifiedViews - a.qualifiedViews).slice(0, 5),
          byEngagement: [...deco].sort((a, b) => b.engagement - a.engagement).slice(0, 5),
        };
      }
    }

    // ---------- top content ----------
    const contentAuthorIds = topContentRaw
      .map((row) => idOf(row.authorId))
      .filter((id) => Types.ObjectId.isValid(id));
    const contentAuthors = contentAuthorIds.length > 0
      ? await User.find({ _id: { $in: [...new Set(contentAuthorIds)] } }).select("name").lean()
      : [];
    const contentAuthorMap = new Map(contentAuthors.map((user) => [idOf(user._id), user.name ?? "Unknown"]));
    const topContent = topContentRaw.map((row) => ({
      id: idOf(row._id),
      preview: String(row.content ?? ""),
      authorName: contentAuthorMap.get(idOf(row.authorId)) ?? "Unknown",
      likes: row.likes ?? 0,
      comments: row.comments ?? 0,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ""),
    }));

    // ---------- activity feed ----------
    const nowThreshold = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [recentUsers, recentPosts, recentReports] = await Promise.all([
      User.find({ isAI: { $ne: true }, createdAt: { $gte: nowThreshold } })
        .sort({ createdAt: -1 })
        .limit(6)
        .select("name email createdAt")
        .lean(),
      Post.aggregate([
        { $match: { createdAt: { $gte: nowThreshold } } },
        { $sort: { createdAt: -1 } },
        { $limit: 6 },
        {
          $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "author" },
        },
        {
          $project: {
            content: 1,
            images: 1,
            createdAt: 1,
            authorName: { $arrayElemAt: ["$author.name", 0] },
          },
        },
      ]),
      Report.aggregate([
        { $match: { createdAt: { $gte: nowThreshold } } },
        { $sort: { createdAt: -1 } },
        { $limit: 6 },
        { $lookup: { from: "users", localField: "reporterId", foreignField: "_id", as: "reporter" } },
        {
          $project: {
            reason: 1,
            status: 1,
            contentType: 1,
            createdAt: 1,
            reporterName: { $arrayElemAt: ["$reporter.name", 0] },
          },
        },
      ]),
    ]);

    const auditRows = auditLogs as unknown as Array<Record<string, unknown>>;
    const auditAdminIds = auditRows
      .map((row) => idOf(row.adminId))
      .filter((id) => Types.ObjectId.isValid(id));
    const auditAdminMap = new Map(
      (
        await User.find({ _id: { $in: [...new Set(auditAdminIds)] } }).select("name").lean()
      ).map((user) => [idOf(user._id), user.name ?? "Admin"])
    );

    const activityItems: Array<Record<string, unknown>> = [];
    const stamp = (value: unknown) => {
      const date = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
    };

    for (const row of recentUsers) {
      activityItems.push({
        type: "registration",
        title: `${row.name} registered on OrbitByte`,
        ref: row.email,
        timestamp: new Date(stamp(row.createdAt)).toISOString(),
        status: "New user",
      });
    }
    for (const row of recentPosts) {
      const isVideo = (row.images as string[] | undefined)?.some((url) => VIDEO_URL_RE.test(url));
      activityItems.push({
        type: isVideo ? "video" : "post",
        title: `${row.authorName ?? "A user"} posted ${isVideo ? "a video" : "an update"}`,
        ref: String(row.content ?? "").slice(0, 42) || "—",
        timestamp: new Date(stamp(row.createdAt)).toISOString(),
        status: isVideo ? "New video" : "New post",
      });
    }
    for (const row of recentReports) {
      activityItems.push({
        type: "report",
        title: `Report filed on a ${row.contentType ?? "post"}`,
        ref: String(row.reason ?? ""),
        timestamp: new Date(stamp(row.createdAt)).toISOString(),
        status: `Report is ${String(row.status ?? "").toLowerCase()}`,
      });
    }
    for (const row of auditRows) {
      const action = String(row.action ?? "");
      if (!AUDIT_ACTIVITY_RE.test(action)) continue;
      activityItems.push({
        type: "admin",
        title: action.replace(/_/g, " ").toLowerCase(),
        ref: auditAdminMap.get(idOf(row.adminId)) ?? "Admin",
        timestamp: new Date(stamp(row.createdAt)).toISOString(),
        status: "Admin action",
      });
    }

    activityItems.sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime());
    const activity = activityItems.slice(0, 24);

    // ---------- withdrawals report ----------
    const withdrawalsByStatus = Object.fromEntries(
      WITHDRAWAL_STATUSES.map((status) => {
        const row = withdrawStatus(status);
        return [
          status,
          { count: row?.count ?? 0, paise: row?.paise ?? 0 },
        ];
      })
    );

    return NextResponse.json({
      range: {
        key: rangeKey,
        label: range.label,
        granule,
        fromIso: curStart.toISOString(),
        prevFromIso: prevStart.toISOString(),
        toIso: to.toISOString(),
      },
      cards: {
        totalUsers: cardUsers,
        activeUsers: activeCurrent,
        activeUsersPrev: activePrevious,
        newUsers,
        newUsersPrev,
        newPosts,
        newPostsPrev,
        newVideos,
        newVideosPrev,
        newProjects,
        totalPosts,
        removedPosts,
        totalVideos,
        totalProjects: projectTotal,
        totalComments,
        totalLikes,
        totalShares,
        totalFollowers,
        premium: premiumUsers,
        verified: verifiedUsers,
        suspended: suspendedUsers,
        banned: bannedUsers,
        reports: reportTotal,
        pendingReports: reportStatusMap.get("PENDING") ?? 0,
      },
      changes: {
        users: change(usersNewWindow),
        posts: change(postsWindow),
        videos: change(videosWindow),
        projects: change(projectsWindow),
        engagement: toPct(engagementNow, engagementPrev),
        revenue: change(revenueWindow),
        withdrawals: change(withdrawalsWindow),
        reports: change(reportsWindow),
        activeUsers: toPct(activeCurrent, activePrevious),
        comments: change(commentsWindow),
      },
      revenue: {
        platformRevenue,
        creatorPool,
        creatorEarnings: creatorEarningsTotal,
        walletEarned: paiseToRupees(walletTotalsDoc.earned),
        withdrawn: withdrawnTotal,
        withdrawnCount: completedWithdrawnCount,
        pending: pendingPayouts,
        available: availableBalance,
        period: paiseToRupees(revenueWindow.cur),
        periodPrev: paiseToRupees(revenueWindow.prev),
        likeEarnings: paiseToRupees(earningTotalPaise),
        released: paiseToRupees(releaseTotalPaise),
        backfilled: paiseToRupees(allocatedTotalPaise) - paiseToRupees(releaseTotalPaise),
      },
      content: {
        posts: totalPosts,
        videos: totalVideos,
        removed: removedPosts,
        projects: projectTotal,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        topContent,
      },
      moderation: {
        total: reportTotal,
        pending: reportStatusMap.get("PENDING") ?? 0,
        reviewing: reportStatusMap.get("REVIEWING") ?? 0,
        dismissed: reportStatusMap.get("DISMISSED") ?? 0,
        resolved: reportStatusMap.get("RESOLVED") ?? 0,
        removedContent: removedPosts,
        suspended: suspendedUsers,
        banned: bannedUsers,
      },
      withdrawals: {
        total: withdrawalStatusRows.reduce((sum, row) => sum + (row.count ?? 0), 0),
        totalAmount: withdrawnTotal,
        completedPeriod: paiseToRupees(withdrawalsWindow.cur),
        byStatus: withdrawalsByStatus,
      },
      creators: {
        pool: creatorPool,
        activeCycleLabel: String(activeCycle?.label ?? ""),
        activeCycleStatus: String(activeCycle?.status ?? ""),
        eligibleCreators: Number(activeCycle?.totalEligibleCreators ?? 0),
        totalScores: Number(activeCycle?.totalEligibleScores ?? 0),
        totalQualifiedViews: Number(activeCycle?.totalQualifiedViews ?? 0),
        estimatedEarnings: paiseToRupees(estimatedPoolPaise),
        finalizedEarnings: creatorEarningsTotal,
        released: paiseToRupees(releaseTotalPaise),
        topCreators,
      },
      engagement: {
        likes: likesWindow.cur,
        likesPrev: likesWindow.prev,
        comments: commentsWindow.cur,
        commentsPrev: commentsWindow.prev,
        shares: sharesWindow.cur,
        sharesPrev: sharesWindow.prev,
      },
      series: {
        users: seriesUsers,
        active: seriesActive,
        content: contentSeries,
        projects: seriesProjects,
        engagement: {
          likes: seriesLikes,
          comments: seriesComments,
          shares: seriesShares,
        },
        revenue: seriesRevenue,
        creator: seriesCreator,
        withdrawals: seriesWithdrawals,
        reports: seriesReports,
      },
      activity,
    });
  } catch (error) {
    console.error("ADMIN DASHBOARD ERROR:", error);
    return NextResponse.json({ error: "Unable to load dashboard overview" }, { status: 500 });
  }
}