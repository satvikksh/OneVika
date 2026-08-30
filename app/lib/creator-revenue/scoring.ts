import { CreatorMetricKey, METRIC_KEYS, METRIC_LABELS, round2 } from "./constants";
import { scoreFromRate } from "./normalize";
import type { MetricNormalizationRule } from "@/app/models/RevenueConfiguration";

export interface MetricRates {
  watchQualityRate: number;
  completionRate: number;
  uniqueAudienceRate: number;
  shareRate: number;
  meaningfulCommentRate: number;
  returningViewerRate: number;
  followRate: number;
}

export interface CreatorMetrics {
  qualifiedViews: number;
  qualifiedWatchMs: number;
  qualifiedWatchOpportunityMs: number;
  completedViews: number;
  uniqueViewers: number;
  returningViewers: number;
  meaningfulComments: number;
  qualifiedShares: number;
  qualifiedFollows: number;
  qualifiedLikes: number;
  riskScore: number;
  qualityFactor: number;
}

export interface MetricScoreResult {
  key: CreatorMetricKey;
  label: string;
  weight: number;
  subScore: number;
  weighted: number;
}

export interface ScoreResult {
  score: number;
  parts: MetricScoreResult[];
  rates: MetricRates;
}

function rateResult(key: CreatorMetricKey, rate: number): number {
  return Number.isFinite(rate) ? rate : 0;
}

/**
 * Derive the rate for every metric.
 * All rates are quality metrics that reward healthy ratios rather than raw
 * volume, so a smaller-but-engaged creator can compete with a large one.
 */
export function computeMetricRates(metrics: CreatorMetrics): MetricRates {
  const views = Math.max(metrics.qualifiedViews, 0);
  const unique = Math.max(metrics.uniqueViewers, 0);
  const opportunity = Math.max(metrics.qualifiedWatchOpportunityMs, 0);

  return {
    watchQualityRate: rateResult(
      "watchQuality",
      opportunity > 0 ? metrics.qualifiedWatchMs / opportunity : 0
    ),
    completionRate: rateResult("completion", views > 0 ? metrics.completedViews / views : 0),
    uniqueAudienceRate: rateResult("uniqueAudience", views > 0 ? unique / views : 0),
    shareRate: rateResult("shares", views > 0 ? metrics.qualifiedShares / views : 0),
    meaningfulCommentRate: rateResult(
      "meaningfulComments",
      views > 0 ? metrics.meaningfulComments / views : 0
    ),
    returningViewerRate: rateResult(
      "returningViewers",
      unique > 0 ? metrics.returningViewers / unique : 0
    ),
    followRate: rateResult(
      "followsGenerated",
      views > 0 ? metrics.qualifiedFollows / views : 0
    ),
  };
}

const RATE_FOR_KEY: Record<
  CreatorMetricKey,
  keyof MetricRates
> = {
  watchQuality: "watchQualityRate",
  completion: "completionRate",
  uniqueAudience: "uniqueAudienceRate",
  shares: "shareRate",
  meaningfulComments: "meaningfulCommentRate",
  returningViewers: "returningViewerRate",
  followsGenerated: "followRate",
};

/**
 * Normalize metrics into per-metric 0..100 sub-scores using the configured
 * weights + normalization rules, then combine them into the Earning Score.
 */
export function computeScore(
  metrics: CreatorMetrics,
  weights: Record<CreatorMetricKey, number>,
  normalization: Record<CreatorMetricKey, MetricNormalizationRule>
): ScoreResult {
  const rates = computeMetricRates(metrics);
  const parts: MetricScoreResult[] = [];
  let score = 0;

  for (const key of METRIC_KEYS) {
    const rule = normalization[key];
    const rate = rates[RATE_FOR_KEY[key]];
    const subScore = scoreFromRate({
      rate,
      cap: rule.rateCap,
      count: countForMetric(metrics, key),
      minCount: rule.minCount,
      curvePower: rule.curvePower,
    });
    const weight = typeof weights[key] === "number" ? weights[key] : rule.weight;
    const weighted = Math.round(subScore * weight) / 100;

    parts.push({
      key,
      label: METRIC_LABELS[key],
      weight,
      subScore,
      weighted: round2(weighted),
    });
    score += weighted;
  }

  return {
    score: round2(score),
    parts,
    rates,
  };
}

function countForMetric(metrics: CreatorMetrics, key: CreatorMetricKey): number {
  switch (key) {
    case "watchQuality":
      return metrics.qualifiedViews;
    case "completion":
      return metrics.qualifiedViews;
    case "uniqueAudience":
      return metrics.qualifiedViews;
    case "shares":
      return metrics.qualifiedShares;
    case "meaningfulComments":
      return metrics.meaningfulComments;
    case "returningViewers":
      return metrics.uniqueViewers;
    case "followsGenerated":
      return metrics.qualifiedFollows;
  }
}