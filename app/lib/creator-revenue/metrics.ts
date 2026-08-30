import { Types } from "mongoose";
import ViewerActivity from "@/app/models/ViewerActivity";
import { CreatorMetrics } from "./scoring";
import { assessRisk, RiskInput } from "./risk";

export interface CreatorActivityTotals {
  creatorId: Types.ObjectId;
  rawViewStarts: number;
  qualifiedViews: number;
  qualifiedWatchMs: number;
  opportunityMs: number;
  completedViews: number;
  meaningfulComments: number;
  qualifiedShares: number;
  qualifiedFollows: number;
  qualifiedLikes: number;
  uniqueViewers: number;
  returningViewers: number;
  activeDays: number;
  flaggedDocs: number;
  totalDocs: number;
  docsWithExcessStarts: number;
  docsWithLowCompletion: number;
  rawWatchMs: number;
}

export interface CreatorMetricResult {
  totals: CreatorActivityTotals;
  metrics: CreatorMetrics;
  riskScore: number;
  qualityFactor: number;
  riskSignals: string[];
}

export function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function dayRangeKeys(start: Date, end: Date) {
  const startKey = dayKey(start);
  const endKey = dayKey(end);
  return { startKey, endKey };
}

export async function aggregateCreatorActivities(
  startDate: Date,
  endDate: Date,
  creatorIds?: Types.ObjectId[]
): Promise<CreatorActivityTotals[]> {
  const { startKey, endKey } = dayRangeKeys(startDate, endDate);

  const creatorMatch =
    creatorIds && creatorIds.length > 0 ? { creatorId: { $in: creatorIds } } : {};

  const [quantityRows, returnRows] = await Promise.all([
    ViewerActivity.aggregate<{
      _id: Types.ObjectId;
      viewers: Types.ObjectId[];
      [key: string]: unknown;
    }>([
      { $match: { day: { $gte: startKey, $lte: endKey }, ...creatorMatch } },
      {
        $group: {
          _id: "$creatorId",
          rawViewStarts: { $sum: "$viewStarts" },
          qualifiedViews: { $sum: "$qualifiedViews" },
          qualifiedWatchMs: { $sum: "$qualifiedWatchMs" },
          opportunityMs: { $sum: "$opportunityMs" },
          completedViews: { $sum: "$completedViews" },
          meaningfulComments: { $sum: "$meaningfulComments" },
          qualifiedShares: { $sum: "$qualifiedShares" },
          qualifiedFollows: { $sum: "$qualifiedFollows" },
          qualifiedLikes: { $sum: "$qualifiedLikes" },
          rawWatchMs: { $sum: "$watchMs" },
          flaggedDocs: {
            $sum: { $cond: [{ $eq: ["$flagged", true] }, 1, 0] },
          },
          totalDocs: { $sum: 1 },
          docsWithExcessStarts: {
            $sum: {
              $cond: [{ $gte: ["$viewStarts", 12] }, 1, 0],
            },
          },
          docsWithLowCompletion: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$viewStarts", 0] },
                    {
                      $lte: [
                        {
                          $divide: [
                            { $ifNull: ["$qualifiedViews", 0] },
                            "$viewStarts",
                          ],
                        },
                        0.3,
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          viewers: { $addToSet: "$viewerId" },
        },
      },
    ]),
    ViewerActivity.aggregate<{
      _id: Types.ObjectId;
      returningViewers: number;
      activeDays: number;
    }>([
      { $match: { day: { $gte: startKey, $lte: endKey }, ...creatorMatch } },
      { $group: { _id: { c: "$creatorId", v: "$viewerId", d: "$day" } } },
      {
        $group: {
          _id: { creatorId: "$_id.c", viewerId: "$_id.v" },
          activeDays: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.creatorId",
          returningViewers: {
            $sum: { $cond: [{ $gte: ["$activeDays", 2] }, 1, 0] },
          },
          activeDays: { $sum: "$activeDays" },
        },
      },
    ]),
  ]);

  const returnMap = new Map(
    returnRows.map((row) => [
      row._id.toString(),
      { returningViewers: row.returningViewers, activeDays: row.activeDays },
    ])
  );

  return quantityRows.map((row) => {
    const viewerIds = (row.viewers as Types.ObjectId[]) ?? [];
    const returnData = returnMap.get(row._id.toString()) ?? {
      returningViewers: 0,
      activeDays: 0,
    };

    return {
      creatorId: row._id,
      rawViewStarts: asPositive(row.rawViewStarts),
      qualifiedViews: asPositive(row.qualifiedViews),
      qualifiedWatchMs: asPositive(row.qualifiedWatchMs),
      opportunityMs: asPositive(row.opportunityMs),
      completedViews: asPositive(row.completedViews),
      meaningfulComments: asPositive(row.meaningfulComments),
      qualifiedShares: asPositive(row.qualifiedShares),
      qualifiedFollows: asPositive(row.qualifiedFollows),
      qualifiedLikes: asPositive(row.qualifiedLikes),
      uniqueViewers: viewerIds.length,
      returningViewers: returnData.returningViewers,
      activeDays: returnData.activeDays,
      flaggedDocs: asPositive(row.flaggedDocs),
      totalDocs: asPositive(row.totalDocs),
      docsWithExcessStarts: asPositive(row.docsWithExcessStarts),
      docsWithLowCompletion: asPositive(row.docsWithLowCompletion),
      rawWatchMs: asPositive(row.rawWatchMs),
    };
  });
}

/**
 * Turn raw aggregated totals into scored metrics. The fraud/risk layer runs
 * here, BEFORE scoring: a `qualityFactor` (0..1) discounts every qualified
 * metric of creators whose aggregated risk signals are elevated.
 */
export function toCreatorMetricResult(
  totals: CreatorActivityTotals
): CreatorMetricResult {
  const risk = assessRisk(toRiskInput(totals));

  const scale = risk.qualityFactor;
  const metrics: CreatorMetrics = {
    qualifiedViews: Math.round(totals.qualifiedViews * scale),
    qualifiedWatchMs: Math.round(totals.qualifiedWatchMs * scale),
    qualifiedWatchOpportunityMs: Math.round(totals.opportunityMs * scale),
    completedViews: Math.round(totals.completedViews * scale),
    uniqueViewers: Math.round(totals.uniqueViewers * scale),
    returningViewers: Math.round(totals.returningViewers * scale),
    meaningfulComments: Math.round(totals.meaningfulComments * scale),
    qualifiedShares: Math.round(totals.qualifiedShares * scale),
    qualifiedFollows: Math.round(totals.qualifiedFollows * scale),
    qualifiedLikes: Math.round(totals.qualifiedLikes * scale),
    riskScore: risk.riskScore,
    qualityFactor: risk.qualityFactor,
  };

  return {
    totals,
    metrics,
    riskScore: risk.riskScore,
    qualityFactor: risk.qualityFactor,
    riskSignals: risk.signals,
  };
}

function toRiskInput(totals: CreatorActivityTotals): RiskInput {
  return {
    qualifiedViews: totals.qualifiedViews,
    rawViewStarts: totals.rawViewStarts,
    qualifiedWatchMs: totals.qualifiedWatchMs,
    rawWatchMs: totals.rawWatchMs,
    completedViews: totals.completedViews,
    meaningfulComments: totals.meaningfulComments,
    qualifiedShares: totals.qualifiedShares,
    qualifiedFollows: totals.qualifiedFollows,
    qualifiedLikes: totals.qualifiedLikes,
    flaggedDocs: totals.flaggedDocs,
    totalDocs: totals.totalDocs,
    docsWithExcessStarts: totals.docsWithExcessStarts,
    docsWithLowCompletion: totals.docsWithLowCompletion,
    uniqueViewers: totals.uniqueViewers,
  };
}

function asPositive(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(Math.round(value), 0)
    : 0;
}