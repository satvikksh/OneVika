import { safeRate } from "./normalize";

export interface RiskInput {
  qualifiedViews: number;
  rawViewStarts: number;
  qualifiedWatchMs: number;
  rawWatchMs: number;
  completedViews: number;
  meaningfulComments: number;
  qualifiedShares: number;
  qualifiedFollows: number;
  qualifiedLikes: number;
  flaggedDocs: number;
  totalDocs: number;
  docsWithExcessStarts: number;
  docsWithLowCompletion: number;
  uniqueViewers: number;
}

export interface RiskAssessment {
  riskScore: number;
  qualityFactor: number;
  signals: string[];
  suspiciousViews: number;
  rejectedViews: number;
  detail: Record<string, number>;
}

const SIGNAL_DEFS = [
  {
    name: "REPEATED_VIEWING",
    weight: 0.3,
    compute: (input: RiskInput) =>
      input.totalDocs > 0
        ? safeRate(input.docsWithExcessStarts, input.totalDocs)
        : 0,
    description: "Viewers repeatedly revisiting the same content far beyond normal limits",
  },
  {
    name: "LOW_COMPLETION",
    weight: 0.2,
    compute: (input: RiskInput) =>
      input.totalDocs > 0
        ? safeRate(input.docsWithLowCompletion, input.totalDocs)
        : 0,
    description: "High share of abandoned, sub-second engagements",
  },
  {
    name: "WATCH_OVERFLOW",
    weight: 0.15,
    compute: (input: RiskInput) =>
      input.rawWatchMs > 0
        ? safeRate(Math.max(input.rawWatchMs - input.qualifiedWatchMs, 0), input.rawWatchMs)
        : 0,
    description: "Watch time recorded without qualifying as an eligible view",
  },
  {
    name: "AUTOMATED_ENGAGEMENT",
    weight: 0.2,
    compute: (input: RiskInput) => {
      if (input.qualifiedViews === 0) return 0;
      const engagement =
        safeRate(input.qualifiedLikes, input.qualifiedViews) +
        safeRate(input.meaningfulComments, input.qualifiedViews) +
        safeRate(input.qualifiedFollows, input.qualifiedViews);
      // Engagement ratios far above realistic organic ceilings are bot-like.
      return engagement > 0.9 ? Math.min((engagement - 0.9) / 0.9, 1) : 0;
    },
    description: "Engagement-to-view ratios far above realistic organic levels",
  },
  {
    name: "FLAGGED_TRAFFIC",
    weight: 0.15,
    compute: (input: RiskInput) =>
      input.totalDocs > 0 ? safeRate(input.flaggedDocs, input.totalDocs) : 0,
    description: "Share of individual activity rows already flagged by the ingestion layer",
  },
] as const;

/**
 * Aggregated fraud-risk assessment for a creator's monthly activity.
 *
 * Uses a weighted combination of multiple signals, so a single weak signal
 * never automatically punishes a legitimate creator. Everything is derived
 * from QUALIFIED-safe denominators and only reduces, never fabricates, value.
 */
export function assessRisk(input: RiskInput): RiskAssessment {
  const signals: string[] = [];
  const detail: Record<string, number> = {};
  let weightedRisk = 0;

  for (const def of SIGNAL_DEFS) {
    const value = def.compute(input);
    detail[def.name] = Math.round(value * 10000) / 10000;
    if (value > 0.12) signals.push(def.name);
    weightedRisk += value * def.weight;
  }

  const riskScore = Math.round(Math.min(Math.max(weightedRisk, 0), 1) * 100);
  const qualityFactor = Math.max(1 - weightedRisk, 0);

  // Suspicious / rejected view proxies for the fraud dashboard.
  const suspiciousViews = input.rawViewStarts - input.qualifiedViews;
  const rejectedViews = Math.max(
    input.rawViewStarts - input.qualifiedViews - Math.round(input.rawWatchMs / 3000),
    0
  );

  return {
    riskScore,
    qualityFactor,
    signals,
    suspiciousViews,
    rejectedViews,
    detail,
  };
}