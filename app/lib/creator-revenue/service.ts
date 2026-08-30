import mongoose, { ClientSession, Types } from "mongoose";

import RevenueConfiguration, {
  IRevenueConfiguration,
  defaultRevenueConfiguration,
} from "@/app/models/RevenueConfiguration";
import ViewerActivity, { ActivityQuality } from "@/app/models/ViewerActivity";
import CreatorEarningCycle from "@/app/models/CreatorEarningCycle";
import CreatorMetricSnapshot, {
  CreatorRevenueState,
} from "@/app/models/CreatorMetricSnapshot";
import CreatorRevenueAllocation from "@/app/models/CreatorRevenueAllocation";
import CreatorFraudReview, {
  FraudReviewStatus,
} from "@/app/models/CreatorFraudReview";
import CreatorEarningTransaction from "@/app/models/CreatorEarningTransaction";
import Wallet from "@/app/models/Wallet";
import Post from "@/app/models/Post";
import User from "@/app/models/User";
import PlatformSettings from "@/app/models/PlatformSettings";
import { getOrCreateWallet, INR_CURRENCY } from "@/app/lib/earnings";
import {
  sanitizeStoredConfig,
  RevenueConfigurationLike,
} from "./config";
import { qualifyEvent } from "./qualify";
import { qualifiesMeaningfulComment } from "./comments";
import { CreatorMetrics, computeScore } from "./scoring";
import {
  CreatorActivityTotals,
  aggregateCreatorActivities,
  dayKey,
  toCreatorMetricResult,
} from "./metrics";
import { distributeRevenue } from "./distribute";
import { evaluateEligibility } from "./eligibility";
import { CreatorMetricKey, round2 } from "./constants";

export type IngestEventType =
  | "view_start"
  | "watch"
  | "complete"
  | "like"
  | "comment"
  | "follow"
  | "share";

export interface IngestEvent {
  eventId?: string;
  eventType: IngestEventType;
  contentId?: string;
  creatorId?: string;
  watchedMs?: number;
  durationMs?: number;
  completed?: boolean;
  commentText?: string;
}

export interface IngestResult {
  accepted: number;
  rejected: number;
  skipped: number;
}

const RECENT_DEDUPE_CAP = 5000;
const recentEventIds = new Map<string, number>();

function consumeEventKey(key: string | null): boolean {
  if (!key) return false;
  const now = Date.now();
  const last = recentEventIds.get(key);
  if (last !== undefined && now - last < 10 * 60 * 1000) return true;
  recentEventIds.set(key, now);
  if (recentEventIds.size > RECENT_DEDUPE_CAP) {
    const oldest = recentEventIds.keys().next().value as string | undefined;
    if (oldest) recentEventIds.delete(oldest);
  }
  return false;
}

/* ============================================================================
 * DATE / CYCLE HELPERS
 * ========================================================================== */

export function monthLabel(date: Date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function labelToRange(label: string) {
  const [year, month] = label.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, (month || 1) - 1, 1));
  const endDate = new Date(Date.UTC(year, month || 1, 0, 23, 59, 59, 999));
  return { startDate, endDate };
}

export async function getRevenueConfiguration(
  session?: ClientSession | null
): Promise<IRevenueConfiguration> {
  const existing = await RevenueConfiguration.findOne({
    key: "creator-revenue",
  }).session(session ?? null);
  if (existing) {
    const stored = existing.toObject() as unknown as Partial<RevenueConfigurationLike>;
    const sanitized = sanitizeStoredConfig(stored);
    const configFields = [
      "enabled",
      "weights",
      "normalization",
      "viewQuality",
      "commentQuality",
      "eligibility",
      "pool",
      "minimumWithdrawalPaise",
    ] as const;
    const changed = configFields.some(
      (k) =>
        JSON.stringify((stored as Record<string, unknown>)[k]) !==
        JSON.stringify((sanitized as Record<string, unknown>)[k])
    );
    if (changed) {
      Object.assign(existing, sanitized);
      await existing.save({ session: session ?? undefined });
    }
    return existing;
  }

  const created = new RevenueConfiguration({
    ...defaultRevenueConfiguration(),
  });
  await created.save({ session: session ?? undefined });
  return created;
}

export function computePoolPaise(config: IRevenueConfiguration) {
  const { pool } = config;
  if (typeof pool.poolOverridePaise === "number" && pool.poolOverridePaise > 0) {
    return Math.floor(pool.poolOverridePaise);
  }
  if (pool.eligibleRevenuePaise > 0 && pool.creatorPoolPercentage > 0) {
    return Math.floor((pool.eligibleRevenuePaise * pool.creatorPoolPercentage) / 100);
  }
  return Math.floor(pool.defaultMonthlyPoolPaise);
}

/** Current month's cycle: creates an OPEN cycle for today's month if missing. */
export async function getActiveCycle(session?: ClientSession | null) {
  const label = monthLabel();
  const config = await getRevenueConfiguration(session);
  let cycle = await CreatorEarningCycle.findOne({ label }).session(session ?? null);
  if (!cycle) {
    const { startDate, endDate } = labelToRange(label);
    const poolPaise = computePoolPaise(config);
    cycle = new CreatorEarningCycle({
      label,
      status: "OPEN",
      startDate,
      endDate,
      currency: INR_CURRENCY,
      revenuePoolPaise: poolPaise,
      estimatedPoolPaise: poolPaise,
      weightSnapshot: { ...config.weights },
      normalizationSnapshot: JSON.parse(JSON.stringify(config.normalization)),
      viewQualitySnapshot: JSON.parse(JSON.stringify(config.viewQuality)),
      commentQualitySnapshot: JSON.parse(JSON.stringify(config.commentQuality)),
      eligibilitySnapshot: JSON.parse(JSON.stringify(config.eligibility)),
    });
    await cycle.save({ session: session ?? undefined });
  }
  return cycle;
}

/** Find or create a cycle for an arbitrary month label (admin use). */
export async function findOrCreateCycleForLabel(label: string) {
  const config = await getRevenueConfiguration();
  let cycle = await CreatorEarningCycle.findOne({ label });
  if (!cycle) {
    const { startDate, endDate } = labelToRange(label);
    const poolPaise = computePoolPaise(config);
    cycle = new CreatorEarningCycle({
      label,
      status: "OPEN",
      startDate,
      endDate,
      currency: INR_CURRENCY,
      revenuePoolPaise: poolPaise,
      estimatedPoolPaise: poolPaise,
      weightSnapshot: { ...config.weights },
      normalizationSnapshot: JSON.parse(JSON.stringify(config.normalization)),
      viewQualitySnapshot: JSON.parse(JSON.stringify(config.viewQuality)),
      commentQualitySnapshot: JSON.parse(JSON.stringify(config.commentQuality)),
      eligibilitySnapshot: JSON.parse(JSON.stringify(config.eligibility)),
    });
    await cycle.save();
  }
  return cycle;
}

/* ============================================================================
 * INGESTION
 * ========================================================================== */

type PostLean = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
};

export async function recordActivity({
  viewerId,
  events,
}: {
  viewerId: Types.ObjectId;
  events: IngestEvent[];
}): Promise<IngestResult> {
  let accepted = 0;
  let rejected = 0;
  let skipped = 0;

  if (!events?.length) return { accepted, rejected, skipped };

  const config = await getRevenueConfiguration();

  const viewer = await User.findById(viewerId).select("_id name email isAI role createdAt");
  if (!viewer) return { accepted, rejected, skipped: events.length };

  const contentIds = [
    ...new Set(
      events
        .filter((e) => e.eventType !== "follow")
        .map((e) => e.contentId)
    ),
  ];
  const posts = await Post.find({
    _id: {
      $in: contentIds
        .map((id) => validObjectId(id))
        .filter((id): id is Types.ObjectId => id !== null),
    },
  })
    .select("_id userId")
    .lean();

  const postMap = new Map(
    posts.map((post) => [post._id.toString(), post as PostLean])
  );

  const arrival = new Date();
  const day = dayKey(arrival);
  const viewerAccountAgeSeconds = Math.max(
    (arrival.getTime() - new Date(viewer.createdAt).getTime()) / 1000,
    0
  );
  const viewerIsAI = Boolean(viewer.isAI);

  for (const event of events) {
    const isFollow = event.eventType === "follow";
    const clientContentId = validObjectId(event.contentId);
    const clientCreatorId = event.creatorId ? validObjectId(event.creatorId) : null;

    // `creatorId` is resolved server-side: from the content owner for
    // content-backed events, or from the (server-provided) creator for follows.
    let contentId: Types.ObjectId | null;
    let creatorId: Types.ObjectId | null;

    if (isFollow) {
      if (!clientCreatorId) {
        skipped++;
        continue;
      }
      creatorId = clientCreatorId;
      if (creatorId.equals(viewerId)) {
        rejected++;
        continue;
      }
      contentId = clientContentId ?? creatorId;
    } else {
      contentId = clientContentId;
      if (!contentId) {
        skipped++;
        continue;
      }
      const post = postMap.get(contentId.toString());
      if (!post) {
        skipped++;
        continue;
      }
      creatorId = validObjectId(String(post.userId));
      if (!creatorId || creatorId.equals(viewerId)) {
        rejected++;
        continue;
      }
      // Never trust a client-provided creatorId: the content owner is the creator.
      if (clientCreatorId && !creatorId.equals(clientCreatorId)) {
        rejected++;
        continue;
      }
    }

    const dedupeKey =
      event.eventId && !consumeEventKey(`${viewerId}:${contentId}:${event.eventId}`)
        ? `${viewerId}:${contentId}:${event.eventId}`
        : null;
    if (dedupeKey === null && event.eventId) {
      skipped++;
      continue;
    }

    const doc = await ViewerActivity.findOne({
      creatorId,
      contentId,
      viewerId,
      day,
    });

    const result = qualifyEvent(
      {
        eventType: event.eventType,
        viewerIsSelf: false,
        viewerIsAI,
        viewerAccountAgeSeconds,
        dailyStarts: doc?.viewStarts ?? 0,
        dailySessions: doc?.viewStarts ?? 0,
        durationMs: event.durationMs,
        watchedMs: event.watchedMs,
      },
      config.viewQuality
    );

    if (result.quality === "REJECTED") {
      rejected++;
      await upsertActivity(doc, {
        creatorId,
        contentId,
        viewerId,
        day,
        quality: result.quality,
        extra: {
          viewStarts: 1,
          watchMs: Math.round(event.watchedMs ?? 0),
        },
      });
      continue;
    }

    const isQualified = result.quality === "VALID";
    const meaningfulComment =
      event.eventType === "comment"
        ? qualifiesMeaningfulComment(event.commentText ?? "", config.commentQuality)
            .qualified
        : false;

    const extra: Record<string, number> = {};

    switch (event.eventType) {
      case "view_start":
        extra.viewStarts = 1;
        break;
      case "watch":
        if (result.countsAsQualifiedView) {
          extra.qualifiedViews = 1;
          extra.qualifiedWatchMs = result.qualifiedWatchMs;
          if (typeof event.durationMs === "number" && event.durationMs > 0) {
            extra.opportunityMs = Math.floor(event.durationMs);
          }
        } else {
          extra.watchMs = Math.round(event.watchedMs ?? 0);
          extra.viewStarts = 1;
        }
        break;
      case "complete":
        if (result.countsAsCompletedView) {
          extra.completedViews = 1;
          extra.qualifiedViews = 1;
          extra.qualifiedWatchMs = result.qualifiedWatchMs;
          if (typeof event.durationMs === "number" && event.durationMs > 0) {
            extra.opportunityMs = Math.floor(event.durationMs);
          }
        } else {
          extra.watchMs = Math.round(event.watchedMs ?? 0);
          extra.viewStarts = 1;
        }
        break;
      case "like":
        extra.likes = 1;
        if (isQualified) extra.qualifiedLikes = 1;
        break;
      case "comment":
        extra.comments = 1;
        if (isQualified && meaningfulComment) extra.meaningfulComments = 1;
        break;
      case "follow":
        extra.follows = 1;
        if (isQualified) extra.qualifiedFollows = 1;
        break;
      case "share":
        extra.shares = 1;
        if (isQualified) extra.qualifiedShares = 1;
        break;
    }

    accepted++;
    await upsertActivity(doc, {
      creatorId,
      contentId,
      viewerId,
      day,
      quality: result.quality,
      extra,
    });
  }

  return { accepted, rejected, skipped };
}

async function upsertActivity(
  doc: { _id: Types.ObjectId } | null,
  input: {
    creatorId: Types.ObjectId;
    contentId: Types.ObjectId;
    viewerId: Types.ObjectId;
    day: string;
    quality: ActivityQuality;
    extra: Record<string, number>;
  }
) {
  if (doc) {
    await ViewerActivity.updateOne(
      { _id: doc._id },
      {
        $inc: { ...input.extra },
        $set: {
          lastSeenAt: new Date(),
          ...(input.quality !== "VALID" ? { flagged: true } : {}),
        },
      }
    );
    return;
  }

  const { creatorId, contentId, viewerId, day, quality, extra } = input;
  await ViewerActivity.create([
    {
      creatorId,
      contentId,
      viewerId,
      day,
      ...extra,
      lastSeenAt: new Date(),
      flagged: quality !== "VALID",
      highestQuality: quality,
    },
  ]);
}

function validObjectId(value: unknown): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(String(value))) return null;
  return new Types.ObjectId(value as string);
}

/* ============================================================================
 * SCORING
 * ========================================================================== */

export interface CreatorScoreCalc {
  creatorId: Types.ObjectId;
  totals: CreatorActivityTotals;
  metrics: CreatorMetrics;
  scoreResult: ReturnType<typeof computeScore>;
  score: number;
  eligible: boolean;
  reasons: string[];
}

export interface CreatorUserRecord {
  _id: Types.ObjectId;
  createdAt: Date;
  isAI?: boolean;
  followers: number;
  approvedCreator: boolean;
  verified: boolean;
  goodStanding: boolean;
  contentPolicyCompliant: boolean;
}

export interface ScoreComputation {
  cycle: {
    startDate: Date;
    endDate: Date;
    weightSnapshot: Record<CreatorMetricKey, number>;
    normalizationSnapshot: Record<CreatorMetricKey, unknown>;
    eligibilitySnapshot: Record<string, unknown>;
  };
  users: CreatorUserRecord[];
  creatorIds?: Types.ObjectId[];
}

export async function computeCreatorScores(
  input: ScoreComputation
): Promise<CreatorScoreCalc[]> {
  const totals = await aggregateCreatorActivities(
    input.cycle.startDate,
    input.cycle.endDate,
    input.creatorIds
  );

  const weights = input.cycle.weightSnapshot;
  const normalization = sanitizeStoredConfig({
    normalization: input.cycle.normalizationSnapshot,
  }).normalization;
  const eligibility =
    sanitizeStoredConfig({
      eligibility: input.cycle.eligibilitySnapshot as Record<string, unknown>,
    }).eligibility as Parameters<typeof evaluateEligibility>[1];

  const userMap = new Map(input.users.map((u) => [u._id.toString(), u]));
  const fraud = await loadFraudReviewMap();

  const result: CreatorScoreCalc[] = [];
  for (const total of totals) {
    const user = userMap.get(total.creatorId.toString());
    if (!user || user.isAI) continue;

    const metricResult = toCreatorMetricResult(total);
    const scoreResult = computeScore(metricResult.metrics, weights, normalization);
    const score = scoreResult.score;

    const accountAgeDays = Math.max(
      (Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000),
      0
    );

    const fraudStatus = fraud.get(total.creatorId.toString())?.status;

    const eligibilityResult = evaluateEligibility(
      {
        accountAgeDays,
        followers: user.followers,
        qualifiedViews: metricResult.metrics.qualifiedViews,
        qualifiedWatchSeconds: Math.round(metricResult.metrics.qualifiedWatchMs / 1000),
        score,
        verified: user.verified,
        fraudRiskScore: metricResult.riskScore,
        goodStanding: user.goodStanding,
        contentPolicyCompliant: user.contentPolicyCompliant,
        approvedCreator: user.approvedCreator,
        fraudStatus,
      },
      eligibility
    );

    result.push({
      creatorId: total.creatorId,
      totals: total,
      metrics: metricResult.metrics,
      scoreResult,
      score,
      eligible: eligibilityResult.eligible,
      reasons: eligibilityResult.reasons,
    });
  }

  return result;
}

export async function loadCreatorUsers(creatorIds: Types.ObjectId[]) {
  const users = await User.find({ _id: { $in: creatorIds } })
    .select("_id createdAt isAI role")
    .lean();

  const followerMap = await countFollowersByUser(creatorIds);

  return users.map((u) => ({
    _id: u._id as Types.ObjectId,
    createdAt: (u.createdAt as Date) ?? new Date(),
    isAI: Boolean(u.isAI),
    followers: followerMap.get(u._id.toString()) ?? 0,
    approvedCreator: true,
    verified: false,
    goodStanding: true,
    contentPolicyCompliant: true,
  })) as CreatorUserRecord[];
}

async function countFollowersByUser(creatorIds: Types.ObjectId[]) {
  const db = mongoose.connection.db;
  if (!db || creatorIds.length === 0) return new Map<string, number>();
  const rows = await db
    .collection("follows")
    .aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          followingId: { $in: creatorIds },
          status: "active",
        },
      },
      { $group: { _id: "$followingId", count: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

async function loadFraudReviewMap() {
  const reviews = await CreatorFraudReview.find({}).lean();
  return new Map(
    reviews.map((r) => [
      (r.creatorId as Types.ObjectId).toString(),
      { status: r.status as string, riskScore: r.riskScore as number },
    ])
  );
}

/* ============================================================================
 * ESTIMATION
 * ========================================================================== */

export async function upsertEstimateSnapshots(
  cycleId: Types.ObjectId,
  scores: CreatorScoreCalc[]
) {
  const writes = scores.map((s) => ({
    updateOne: {
      filter: { cycleId, creatorId: s.creatorId },
      update: {
        $set: {
          qualifiedViews: s.metrics.qualifiedViews,
          qualifiedWatchMs: s.metrics.qualifiedWatchMs,
          qualifiedWatchOpportunityMs: s.metrics.qualifiedWatchOpportunityMs,
          completedViews: s.metrics.completedViews,
          uniqueViewers: s.metrics.uniqueViewers,
          returningViewers: s.metrics.returningViewers,
          meaningfulComments: s.metrics.meaningfulComments,
          qualifiedShares: s.metrics.qualifiedShares,
          qualifiedFollows: s.metrics.qualifiedFollows,
          qualifiedLikes: s.metrics.qualifiedLikes,
          activeDays: s.totals.activeDays,
          qualityFactor: s.metrics.qualityFactor,
          riskScore: s.metrics.riskScore,
          riskSignals: [],
          metricScores: toSubScoreMap(s.scoreResult),
          weightedParts: toWeightedMap(s.scoreResult),
          score: s.score,
          eligible: s.eligible,
          ineligibilityReasons: s.reasons,
          revenueState: "ESTIMATED" as CreatorRevenueState,
          currency: INR_CURRENCY,
        },
      },
      upsert: true,
    },
  }));

  if (writes.length > 0) {
    await CreatorMetricSnapshot.bulkWrite(writes);
  }
}

/**
 * Near-real-time aggregate of every creator's score. Stored on the cycle so a
 * creator opening Analytics never forces a platform-wide recalculation.
 */
export async function refreshCycleEstimates(cycleId: Types.ObjectId) {
  const cycle = await CreatorEarningCycle.findById(cycleId);
  if (!cycle) throw new Error("Cycle not found");

  if (cycle.status === "FINALIZED" || cycle.status === "PAID") {
    return cycle;
  }

  const config = await getRevenueConfiguration();
  const totals = await aggregateCreatorActivities(cycle.startDate, cycle.endDate);
  const users = await loadCreatorUsers(totals.map((t) => t.creatorId));

  const scores = await computeCreatorScores({
    cycle: cycle as unknown as ScoreComputation["cycle"],
    users,
  });

  await upsertEstimateSnapshots(cycle._id as Types.ObjectId, scores);

  cycle.estimatedTotalScores = round2(
    scores.filter((s) => s.eligible).reduce((sum, s) => sum + s.score, 0)
  );
  cycle.estimatedEligibleCreators = scores.filter((s) => s.eligible).length;
  cycle.estimatedPoolPaise = computePoolPaise(config);
  await cycle.save();

  return cycle;
}

/** Single-creator estimate used by the analytics dashboard. */
export async function estimateForCreator(creatorId: Types.ObjectId) {
  const cycle = await getActiveCycle();
  if (!cycle) return { cycle: null, estimate: null };

  // Cycles that are no longer under calculation serve their frozen snapshot.
  if (cycle.status !== "OPEN") {
    const snapshot = await CreatorMetricSnapshot.findOne({
      cycleId: cycle._id,
      creatorId,
    }).lean();
    if (!snapshot) {
      return { cycle, estimate: null };
    }

    const pooledPaise = cycle.revenuePoolPaise || cycle.estimatedPoolPaise;
    const shareFraction =
      (cycle.totalEligibleScores ?? 0) > 0 && snapshot.score > 0
        ? Math.round((snapshot.score / cycle.totalEligibleScores) * 1e9) / 1e9
        : 0;
    const estimatedRevenuePaise =
      shareFraction > 0 ? Math.floor(pooledPaise * shareFraction) : 0;

    return {
      cycle,
      estimate: {
        score: snapshot.score,
        qualifiedViews: snapshot.qualifiedViews,
        qualifiedWatchMs: snapshot.qualifiedWatchMs,
        completedViews: snapshot.completedViews,
        uniqueViewers: snapshot.uniqueViewers,
        returningViewers: snapshot.returningViewers,
        meaningfulComments: snapshot.meaningfulComments,
        qualifiedShares: snapshot.qualifiedShares,
        qualifiedFollows: snapshot.qualifiedFollows,
        eligible: snapshot.eligible,
        reasons: snapshot.ineligibilityReasons,
        parts: Object.entries(snapshot.metricScores ?? {}).map(
          ([key, subScore]) => ({
            key: key as CreatorMetricKey,
            subScore,
            weighted:
              ((snapshot.weightedParts ?? {})[key as CreatorMetricKey] ?? 0),
          })
        ),
        rates: {},
        totalEligibleScores: cycle.totalEligibleScores ?? 0,
        shareFraction,
        sharePercent: Math.round(shareFraction * 10000) / 100,
        estimatedPoolPaise: pooledPaise,
        estimatedRevenuePaise,
        revenueState: snapshot.revenueState,
        hasCachedCalculation: true,
      },
    };
  }

  const totals = await aggregateCreatorActivities(
    cycle.startDate,
    cycle.endDate,
    [creatorId]
  );
  if (totals.length === 0) {
    return {
      cycle,
      estimate: {
        score: 0,
        metrics: null,
        parts: [],
        rates: {},
        totalEligibleScores: cycle.estimatedTotalScores,
        shareFraction: 0,
        sharePercent: 0,
        estimatedPoolPaise: cycle.estimatedPoolPaise,
        estimatedRevenuePaise: 0,
        eligible: false,
        reasons: [],
        hasCachedCalculation: false,
      },
    };
  }

  const users = await loadCreatorUsers([creatorId]);
  const scoreRow = (await computeCreatorScores({
    cycle: cycle as unknown as ScoreComputation["cycle"],
    users,
    creatorIds: [creatorId],
  }))[0];

  if (!scoreRow) {
    return { cycle, estimate: null };
  }

  // The share denominator comes from the platform-wide cached calculation.
  let totalScores = cycle.estimatedTotalScores;
  let refreshedCycle = cycle;
  if (!(totalScores > 0)) {
    refreshedCycle = await refreshCycleEstimates(cycle._id as Types.ObjectId);
    totalScores = refreshedCycle.estimatedTotalScores;
  }

  const poolPaise = refreshedCycle.estimatedPoolPaise;
  const shareFraction =
    totalScores > 0 && scoreRow.score > 0
      ? Math.round((scoreRow.score / totalScores) * 1e9) / 1e9
      : 0;
  const estimatedRevenuePaise =
    shareFraction > 0 ? Math.floor(poolPaise * shareFraction) : 0;

  return {
    cycle: refreshedCycle,
    estimate: {
      score: scoreRow.score,
      qualifiedViews: scoreRow.metrics.qualifiedViews,
      qualifiedWatchMs: scoreRow.metrics.qualifiedWatchMs,
      completedViews: scoreRow.metrics.completedViews,
      uniqueViewers: scoreRow.metrics.uniqueViewers,
      returningViewers: scoreRow.metrics.returningViewers,
      meaningfulComments: scoreRow.metrics.meaningfulComments,
      qualifiedShares: scoreRow.metrics.qualifiedShares,
      qualifiedFollows: scoreRow.metrics.qualifiedFollows,
      eligible: scoreRow.eligible,
      reasons: scoreRow.reasons,
      parts: scoreRow.scoreResult.parts,
      rates: scoreRow.scoreResult.rates,
      totalEligibleScores: totalScores,
      shareFraction,
      sharePercent: Math.round(shareFraction * 10000) / 100,
      estimatedPoolPaise: poolPaise,
      estimatedRevenuePaise,
      hasCachedCalculation: false,
    },
  };
}

/** Final or released allocations plus transaction history for a creator. */
export async function creatorRevenueHistory(creatorId: Types.ObjectId) {
  const allocations = await CreatorRevenueAllocation.find({ creatorId })
    .sort({ cycleLabel: -1 })
    .limit(24)
    .lean();

  const transactions = await CreatorEarningTransaction.find({
    creatorId,
    type: { $in: ["RELEASE", "WITHDRAWAL", "REFUND"] },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return {
    allocations: allocations.map((a) => publicAllocation(a)),
    transactions: transactions.map((t) => ({
      id: (t._id as Types.ObjectId).toString(),
      cycleId: t.cycleId.toString(),
      allocationId: t.allocationId.toString(),
      withdrawalId: t.withdrawalId
        ? (t.withdrawalId as Types.ObjectId).toString()
        : null,
      type: t.type,
      amountPaise: t.amountPaise,
      currency: t.currency,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt,
    })),
  };
}

/* ============================================================================
 * FINALIZATION (idempotent + immutable)
 * ========================================================================== */

export async function calculateCycle(cycleId: Types.ObjectId) {
  const cycle = await CreatorEarningCycle.findById(cycleId);
  if (!cycle) throw new Error("Cycle not found");
  if (cycle.status === "FINALIZED" || cycle.status === "PAID") {
    return { cycle, recalculated: false };
  }

  await refreshCycleEstimates(cycleId);

  await CreatorEarningCycle.updateOne(
    { _id: cycleId },
    { $set: { status: "UNDER_REVIEW", calculatedAt: new Date() } }
  );
  return {
    cycle: await CreatorEarningCycle.findById(cycleId),
    recalculated: true,
  };
}

export async function finalizeCycle(cycleId: Types.ObjectId) {
  const cycle = await CreatorEarningCycle.findById(cycleId);
  if (!cycle) throw new Error("Cycle not found");

  if (cycle.status === "FINALIZED" || cycle.status === "PAID") {
    return { cycle, finalized: true, alreadyFinalized: true, allocations: 0 };
  }

  const config = await getRevenueConfiguration();
  const poolPaise = computePoolPaise(config);

  const totals = await aggregateCreatorActivities(cycle.startDate, cycle.endDate);
  const users = await loadCreatorUsers(totals.map((t) => t.creatorId));
  const scores = await computeCreatorScores({
    cycle: cycle as unknown as ScoreComputation["cycle"],
    users,
  });

  const eligibleScores = scores.filter((s) => s.eligible && s.score > 0);
  const totalScores = round2(
    eligibleScores.reduce((sum, s) => sum + s.score, 0)
  );

  const dbSession = await mongoose.startSession();
  let distributedAllocations = 0;

  try {
    await dbSession.withTransaction(async () => {
      for (const s of scores) {
        await CreatorMetricSnapshot.updateOne(
          { cycleId, creatorId: s.creatorId },
          {
            $set: {
              qualifiedViews: s.metrics.qualifiedViews,
              qualifiedWatchMs: s.metrics.qualifiedWatchMs,
              qualifiedWatchOpportunityMs: s.metrics.qualifiedWatchOpportunityMs,
              completedViews: s.metrics.completedViews,
              uniqueViewers: s.metrics.uniqueViewers,
              returningViewers: s.metrics.returningViewers,
              meaningfulComments: s.metrics.meaningfulComments,
              qualifiedShares: s.metrics.qualifiedShares,
              qualifiedFollows: s.metrics.qualifiedFollows,
              qualifiedLikes: s.metrics.qualifiedLikes,
              activeDays: s.totals.activeDays,
              qualityFactor: s.metrics.qualityFactor,
              riskScore: s.metrics.riskScore,
              riskSignals: [],
              metricScores: toSubScoreMap(s.scoreResult),
              weightedParts: toWeightedMap(s.scoreResult),
              score: s.score,
              eligible: s.eligible,
              ineligibilityReasons: s.reasons,
              revenueState:
                (s.eligible && s.score > 0 ? "FINALIZED" : "REJECTED") as CreatorRevenueState,
              currency: INR_CURRENCY,
            },
          },
          { upsert: true, session: dbSession }
        );
      }

      if (poolPaise <= 0 || totalScores <= 0) {
        // Zero-pool or zero-total-scores fallback: stay pending review.
        cycle.revenuePoolPaise = poolPaise;
        cycle.totalEligibleScores = totalScores;
        cycle.totalEligibleCreators = eligibleScores.length;
        cycle.status = "UNDER_REVIEW";
        await cycle.save({ session: dbSession });
        return;
      }

      const result = distributeRevenue(
        poolPaise,
        eligibleScores.map((s) => ({
          creatorId: s.creatorId.toString(),
          score: s.score,
          eligible: true,
        }))
      );

      for (const item of result.items) {
        const creatorId = new Types.ObjectId(item.creatorId);
        const scoreRow = scores.find((s) => s.creatorId.equals(creatorId));

        await CreatorRevenueAllocation.updateOne(
          { cycleId, creatorId },
          {
            $setOnInsert: {
              cycleLabel: cycle.label,
              cycleStartDate: cycle.startDate,
              cycleEndDate: cycle.endDate,
              score: item.score,
              metricScores: scoreRow
                ? toSubScoreMap(scoreRow.scoreResult)
                : {},
              weightSnapshot: cycle.weightSnapshot,
              totalEligibleScores: result.totalScore,
              poolPaise: result.poolPaise,
              creatorShareFraction: item.fraction,
              creatorSharePercent: item.sharePercent,
              finalRevenuePaise: item.revenuePaise,
              currency: INR_CURRENCY,
              revenueState: "FINALIZED",
              finalizedAt: new Date(),
            },
          },
          { upsert: true, session: dbSession }
        );

        if (scoreRow) {
          await CreatorMetricSnapshot.updateOne(
            { cycleId, creatorId },
            {
              $set: {
                revenueState: "FINALIZED",
                revenuePaise: item.revenuePaise,
                sharePercent: item.sharePercent,
              },
            },
            { session: dbSession }
          );
        }
        distributedAllocations++;
      }

      cycle.revenuePoolPaise = result.poolPaise;
      cycle.totalEligibleScores = result.totalScore;
      cycle.totalEligibleCreators = result.eligibleCreators;
      cycle.roundingResiduePaise = result.residuePaise;
      cycle.totalQualifiedViews = scores.reduce(
        (sum, s) => sum + s.metrics.qualifiedViews,
        0
      );
      cycle.totalQualifiedWatchMs = scores.reduce(
        (sum, s) => sum + s.metrics.qualifiedWatchMs,
        0
      );
      cycle.status = "FINALIZED";
      cycle.finalizedAt = new Date();
      await cycle.save({ session: dbSession });
    });
  } finally {
    await dbSession.endSession();
  }

  return {
    cycle: await CreatorEarningCycle.findById(cycleId),
    finalized:
      (await CreatorEarningCycle.findById(cycleId))?.status === "FINALIZED",
    alreadyFinalized: false,
    allocations: distributedAllocations,
  };
}

/* ============================================================================
 * RELEASE (idempotent)
 * ========================================================================== */

async function releaseAllocationInternal(
  allocationId: Types.ObjectId,
  wallet: typeof Wallet.prototype | null,
  dbSession: ClientSession
) {
  const allocation = await CreatorRevenueAllocation.findById(allocationId).session(
    dbSession
  );
  if (!allocation) throw new Error("Allocation not found");
  if (
    allocation.revenueState === "RELEASED" ||
    allocation.revenueState === "WITHDRAWN"
  ) {
    return false;
  }

  const existing = await CreatorEarningTransaction.findOne({
    allocationId: allocation._id,
    type: "RELEASE",
  }).session(dbSession);
  if (existing) return false;

  await CreatorEarningTransaction.create(
    [
      {
        creatorId: allocation.creatorId,
        cycleId: allocation.cycleId,
        allocationId: allocation._id,
        type: "RELEASE",
        amountPaise: allocation.finalRevenuePaise,
        currency: INR_CURRENCY,
        status: "COMPLETED",
        description: "Monthly creator revenue released",
      },
    ],
    { session: dbSession }
  );

  const targetWallet =
    wallet ?? (await getOrCreateWallet(allocation.creatorId, dbSession));
  targetWallet.availableBalancePaise += allocation.finalRevenuePaise;
  targetWallet.totalEarnedPaise += allocation.finalRevenuePaise;
  await targetWallet.save({ session: dbSession });

  allocation.revenueState = "RELEASED";
  allocation.releasedAt = new Date();
  await allocation.save({ session: dbSession });

  await CreatorEarningCycle.updateOne(
    { _id: allocation.cycleId },
    { $inc: { releasedRevenuePaise: allocation.finalRevenuePaise } },
    { session: dbSession }
  );

  return true;
}

export async function releaseCycle(cycleId: Types.ObjectId) {
  const cycle = await CreatorEarningCycle.findById(cycleId);
  if (!cycle) throw new Error("Cycle not found");
  if (!["FINALIZED", "UNDER_REVIEW", "PAID"].includes(cycle.status)) {
    throw new Error("Cycle must be finalized before release");
  }

  const allocations = await CreatorRevenueAllocation.find({
    cycleId,
    revenueState: { $in: ["FINALIZED", "RELEASED", "WITHDRAWN"] },
  });

  const session = await mongoose.startSession();
  let released = 0;
  try {
    await session.withTransaction(async () => {
      for (const allocation of allocations) {
        if (
          await releaseAllocationInternal(allocation._id, null, session)
        ) {
          released++;
        }
      }
    });
  } finally {
    await session.endSession();
  }

  await CreatorEarningCycle.updateOne(
    { _id: cycleId },
    {
      $set: {
        status: released > 0 ? "PAID" : cycle.status,
        paidAt: released > 0 ? new Date() : cycle.paidAt ?? null,
      },
    }
  );

  return { released };
}

export async function releaseAllocation(allocationId: Types.ObjectId) {
  const session = await mongoose.startSession();
  try {
    let released = false;
    await session.withTransaction(async () => {
      released = await releaseAllocationInternal(allocationId, null, session);
    });
    return { released };
  } finally {
    await session.endSession();
  }
}

/* ============================================================================
 * FRAUD REVIEW
 * ========================================================================== */

export type FraudAction = "review" | "freeze" | "reject" | "approve" | "release";

export async function applyFraudAction({
  creatorId,
  action,
  adminId,
  note,
  cycleLabel,
}: {
  creatorId: Types.ObjectId;
  action: FraudAction;
  adminId: Types.ObjectId;
  note?: string;
  cycleLabel?: string;
}) {
  const label = cycleLabel ?? monthLabel();
  const cycle = await CreatorEarningCycle.findOne({ label });
  if (!cycle) throw new Error("No earning cycle for this month");

  let review = await CreatorFraudReview.findOne({
    creatorId,
    cycleId: cycle._id,
  });

  if (!review) {
    const totals = await aggregateCreatorActivities(cycle.startDate, cycle.endDate);
    const row = totals.find((t) => t.creatorId.equals(creatorId));
    const created = row
      ? toCreatorMetricResult(row)
      : toCreatorMetricResult(emptyTotals(creatorId));
    review = new CreatorFraudReview({
      creatorId,
      cycleId: cycle._id,
      riskScore: created.riskScore,
      qualifiedViews: created.metrics.qualifiedViews,
      rejectedViews: created.totals
        ? Math.max(created.totals.rawViewStarts - created.metrics.qualifiedViews, 0)
        : 0,
      suspiciousViews: created.totals
        ? Math.max(created.totals.rawViewStarts - created.metrics.qualifiedViews, 0)
        : 0,
      watchMs: created.totals ? created.totals.rawWatchMs : 0,
      signalDetail: created.totals
        ? { watchMs: created.totals.rawWatchMs, qualifiedViews: created.metrics.qualifiedViews }
        : {},
      signals: [],
      status: "UNDER_REVIEW",
    });
    await review.save();
  }

  if (action === "release") {
    const allocation = await CreatorRevenueAllocation.findOne({
      cycleId: cycle._id,
      creatorId,
    });
    if (!allocation) throw new Error("No finalized revenue for this creator");
    await releaseAllocation(allocation._id);
    review.status = "RELEASED";
    review.decidedBy = adminId;
    review.decidedAt = new Date();
    if (note) review.note = note;
    await review.save();
  } else if (
    action === "freeze" ||
    action === "reject" ||
    action === "approve" ||
    action === "review"
  ) {
    if (!review) throw new Error("Fraud review record not found");
    const statusMap: Record<FraudAction, FraudReviewStatus> = {
      review: "UNDER_REVIEW",
      freeze: "FROZEN",
      reject: "REJECTED",
      approve: "APPROVED",
      release: "RELEASED",
    };
    review.status = statusMap[action];
    review.decidedBy = adminId;
    review.decidedAt = new Date();
    if (note !== undefined) review.note = note;
    await review.save();
  }

  return { review, cycleId: cycle._id };
}

function emptyTotals(creatorId: Types.ObjectId): CreatorActivityTotals {
  return {
    creatorId,
    rawViewStarts: 0,
    qualifiedViews: 0,
    qualifiedWatchMs: 0,
    opportunityMs: 0,
    completedViews: 0,
    meaningfulComments: 0,
    qualifiedShares: 0,
    qualifiedFollows: 0,
    qualifiedLikes: 0,
    uniqueViewers: 0,
    returningViewers: 0,
    activeDays: 0,
    flaggedDocs: 0,
    totalDocs: 0,
    docsWithExcessStarts: 0,
    docsWithLowCompletion: 0,
    rawWatchMs: 0,
  };
}

/* ============================================================================
 * WITHDRAWAL INTEGRATION
 * ========================================================================== */

export async function getReleasedAllocationsForUser(
  userId: Types.ObjectId,
  session?: ClientSession | null
) {
  return CreatorRevenueAllocation.find({
    creatorId: userId,
    revenueState: "RELEASED",
  }).session(session ?? null);
}

export function publicAllocation(allocation: {
  _id: Types.ObjectId | { toString: () => string };
  creatorId: Types.ObjectId | { toString: () => string };
  cycleLabel?: string;
  cycleStartDate?: Date;
  cycleEndDate?: Date;
  score?: number;
  metricScores?: Record<string, unknown>;
  weightSnapshot?: Record<string, unknown>;
  totalEligibleScores?: number;
  poolPaise?: number;
  creatorShareFraction?: number;
  creatorSharePercent?: number;
  finalRevenuePaise?: number;
  currency?: string;
  revenueState?: string;
  createdAt?: Date | null;
  finalizedAt?: Date | null;
  releasedAt?: Date | null;
}) {
  return {
    id: allocation._id.toString(),
    creatorId: allocation.creatorId.toString(),
    cycleLabel: allocation.cycleLabel,
    cycleStartDate: allocation.cycleStartDate,
    cycleEndDate: allocation.cycleEndDate,
    score: allocation.score,
    metricScores: allocation.metricScores,
    weightSnapshot: allocation.weightSnapshot,
    totalEligibleScores: allocation.totalEligibleScores,
    poolPaise: allocation.poolPaise,
    poolAmount: allocation.poolPaise ?? 0,
    creatorShareFraction: allocation.creatorShareFraction,
    creatorSharePercent: allocation.creatorSharePercent,
    finalRevenuePaise: allocation.finalRevenuePaise,
    currency: allocation.currency,
    revenueState: allocation.revenueState,
    createdAt: allocation.createdAt,
    finalizedAt: allocation.finalizedAt,
    releasedAt: allocation.releasedAt,
  };
}

export async function syncMinimumWithdrawal(minimumWithdrawalPaise: number) {
  const settings = await PlatformSettings.findOne({ key: "earnings" });
  if (settings && settings.minimumWithdrawalPaise !== minimumWithdrawalPaise) {
    settings.minimumWithdrawalPaise = minimumWithdrawalPaise;
    await settings.save();
  }
}

export function paiseToRupees(paise: number) {
  return Math.round(paise) / 100;
}

export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100);
}

type ScoreResult = ReturnType<typeof computeScore>;

function toSubScoreMap(
  scoreResult: ScoreResult
): Record<CreatorMetricKey, number> {
  return Object.fromEntries(
    scoreResult.parts.map((p) => [p.key, p.subScore])
  ) as Record<CreatorMetricKey, number>;
}

function toWeightedMap(
  scoreResult: ScoreResult
): Record<CreatorMetricKey, number> {
  return Object.fromEntries(
    scoreResult.parts.map((p) => [p.key, p.weighted])
  ) as Record<CreatorMetricKey, number>;
}