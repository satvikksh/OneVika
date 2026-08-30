import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import CreatorEarningCycle from "@/app/models/CreatorEarningCycle";
import CreatorEarningTransaction from "@/app/models/CreatorEarningTransaction";
import CreatorMetricSnapshot from "@/app/models/CreatorMetricSnapshot";
import CreatorRevenueAllocation from "@/app/models/CreatorRevenueAllocation";
import EarningTransaction from "@/app/models/EarningTransaction";
import User from "@/app/models/User";
import Withdrawal from "@/app/models/Withdrawal";

const RANGES: Record<string, { days: number; label: string; granularity: "day" | "month" }> = {
  today: { days: 1, label: "Today", granularity: "day" },
  "7d": { days: 7, label: "7 Days", granularity: "day" },
  "30d": { days: 30, label: "30 Days", granularity: "day" },
  "3m": { days: 92, label: "3 Months", granularity: "month" },
  "1y": { days: 366, label: "1 Year", granularity: "month" },
};

function idOf(value: unknown) {
  return (value as { toString?: () => string })?.toString?.() ?? String(value);
}

async function fetchUserMap(ids: string[]) {
  const map = new Map<string, { name: string; email: string }>();
  const valid = [...new Set(ids)].filter((idValue) => Types.ObjectId.isValid(idValue));
  if (valid.length === 0) return map;
  const users = await User.find({ _id: { $in: valid } })
    .select("name email")
    .lean();
  for (const user of users) {
    map.set(idOf(user._id), { name: user.name, email: user.email });
  }
  return map;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcKey(date: Date, granularity: "day" | "month") {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  if (granularity === "month") return `${year}-${month}`;
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildBuckets(from: Date, now: Date, granularity: "day" | "month") {
  const keys: string[] = [];
  if (granularity === "month") {
    let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const end = utcKey(now, "month");
    while (utcKey(cursor, "month") <= end) {
      keys.push(utcKey(cursor, "month"));
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    return keys;
  }
  let cursor = from;
  while (cursor.getTime() <= now.getTime()) {
    keys.push(utcKey(cursor, "day"));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return keys;
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const rangeKey = searchParams.get("range") ?? "30d";
    const range = RANGES[rangeKey] ?? RANGES["30d"];

    const now = new Date();
    const from = startOfUtcDay(new Date(now.getTime() - (range.days - 1) * 24 * 60 * 60 * 1000));
    const fmt = range.granularity === "month" ? "%Y-%m" : "%Y-%m-%d";

    const [earnedBuckets, withdrawnBuckets, creatorReleaseTotal, eligibleLikes, releasedAllocations, cycleList] =
      await Promise.all([
        EarningTransaction.aggregate<{ _id: string; earned: number }>([
          { $match: { type: "EARNING", status: "COMPLETED", createdAt: { $gte: from } } },
          { $group: { _id: { $dateToString: { format: fmt, date: "$createdAt" } }, earned: { $sum: "$amountPaise" } } },
        ]),
        Withdrawal.aggregate<{ _id: string; withdrawn: number }>([
          {
            $match: {
              status: "COMPLETED",
              $expr: { $gte: [{ $ifNull: ["$completedAt", "$createdAt"] }, from] },
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
              withdrawn: { $sum: "$amountPaise" },
            },
          },
        ]),
        CreatorEarningTransaction.aggregate<{ total: number }>([
          { $match: { type: "RELEASE", status: "COMPLETED", createdAt: { $gte: from } } },
          { $group: { _id: null, total: { $sum: "$amountPaise" } } },
        ]),
        EarningTransaction.countDocuments({
          type: "EARNING",
          status: "COMPLETED",
          createdAt: { $gte: from },
        }),
        CreatorRevenueAllocation.aggregate<{ total: number }>([
          { $match: { releasedAt: { $ne: null } } },
          { $group: { _id: null, total: { $sum: "$finalRevenuePaise" } } },
        ]),
        CreatorEarningCycle.find({}).sort({ startDate: -1 }).lean(),
      ]);

    const earnedMap = new Map(earnedBuckets.map((row) => [row._id, row.earned]));
    const withdrawnMap = new Map(withdrawnBuckets.map((row) => [row._id, row.withdrawn]));
    const dailySeries = buildBuckets(from, now, range.granularity).map((key) => ({
      key,
      earnedPaise: earnedMap.get(key) ?? 0,
      withdrawnPaise: withdrawnMap.get(key) ?? 0,
    }));

    const unpaidCyclePool = cycleList
      .filter((cycle) => cycle.status !== "PAID")
      .reduce((sum, cycle) => sum + (cycle.revenuePoolPaise || cycle.estimatedPoolPaise || 0), 0);
    const activeCycle = cycleList.find((cycle) => cycle.status === "OPEN") ?? cycleList[0] ?? null;

    const snapshotRows = await CreatorMetricSnapshot.find({})
      .sort({ cycleId: -1, score: -1 })
      .limit(30)
      .lean();
    const cycleLabelMap = new Map(cycleList.map((cycle) => [idOf(cycle._id), cycle.label]));
    const snapshotUserIds = snapshotRows.map((snapshot) => idOf(snapshot.creatorId));
    const snapshotUsers = await fetchUserMap(snapshotUserIds);

    const creatorRows = snapshotRows.map((snapshot) => ({
      creatorId: idOf(snapshot.creatorId),
      creatorName: snapshotUsers.get(idOf(snapshot.creatorId))?.name ?? "Unknown creator",
      creatorEmail: snapshotUsers.get(idOf(snapshot.creatorId))?.email ?? "—",
      cycleLabel: cycleLabelMap.get(idOf(snapshot.cycleId)) ?? "—",
      qualifiedViews: snapshot.qualifiedViews,
      qualifiedWatchMs: snapshot.qualifiedWatchMs,
      completedViews: snapshot.completedViews,
      score: snapshot.score,
      revenuePaise: snapshot.revenuePaise,
      revenueState: snapshot.revenueState,
      ineligibilityReasons: snapshot.ineligibilityReasons ?? [],
    }));

    const topEarnerRows = await EarningTransaction.aggregate<{
      _id: Types.ObjectId;
      earned: number;
    }>([
      { $match: { type: "EARNING", status: "COMPLETED" } },
      { $group: { _id: "$userId", earned: { $sum: "$amountPaise" } } },
      { $sort: { earned: -1 } },
      { $limit: 5 },
    ]);
    const topEarnerIds = topEarnerRows.map((row) => idOf(row._id));
    const topEarnerUsers = await fetchUserMap(topEarnerIds);
    const topEarners = topEarnerRows.map((row) => ({
      creatorId: idOf(row._id),
      creatorName: topEarnerUsers.get(idOf(row._id))?.name ?? "Unknown creator",
      creatorEmail: topEarnerUsers.get(idOf(row._id))?.email ?? "—",
      earnedPaise: row.earned,
    }));

    return NextResponse.json({
      range: {
        key: rangeKey,
        label: range.label,
        granularity: range.granularity,
        fromIso: from.toISOString(),
        toIso: now.toISOString(),
      },
      summary: {
        earningsPaise:
          dailySeries.reduce((sum, point) => sum + point.earnedPaise, 0) +
          (creatorReleaseTotal[0]?.total || 0),
        withdrawnPaise: dailySeries.reduce((sum, point) => sum + point.withdrawnPaise, 0),
        eligibleLikes,
        releasedPaise: releasedAllocations[0]?.total || 0,
        poolPaise: unpaidCyclePool,
        activeCycleLabel: activeCycle?.label ?? null,
        activeCycleStatus: activeCycle?.status ?? null,
      },
      dailySeries,
      cycleSeries: cycleList
        .map((cycle) => ({
          id: idOf(cycle._id),
          label: cycle.label,
          status: cycle.status,
          poolPaise: cycle.revenuePoolPaise || cycle.estimatedPoolPaise || 0,
          releasedPaise: cycle.releasedRevenuePaise ?? 0,
          eligibleCreators: cycle.totalEligibleCreators,
          eligibleScores: cycle.totalEligibleScores,
          totalQualifiedViews: cycle.totalQualifiedViews,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      creatorRows,
      topEarners,
      currency: "INR",
    });
  } catch (error) {
    console.error("ADMIN ANALYTICS ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load analytics" },
      { status: 500 }
    );
  }
}