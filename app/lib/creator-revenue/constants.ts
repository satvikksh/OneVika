export const METRIC_KEYS = [
  "watchQuality",
  "completion",
  "uniqueAudience",
  "shares",
  "meaningfulComments",
  "returningViewers",
  "followsGenerated",
] as const;

export type CreatorMetricKey = (typeof METRIC_KEYS)[number];

export const METRIC_LABELS: Record<CreatorMetricKey, string> = {
  watchQuality: "Watch Quality",
  completion: "Video Completion Rate",
  uniqueAudience: "Unique Audience",
  shares: "Shares",
  meaningfulComments: "Meaningful Comments",
  returningViewers: "Returning Viewers",
  followsGenerated: "Follows Generated",
};

export const METRIC_EXPLANATIONS: Record<CreatorMetricKey, string> = {
  watchQuality: "Qualified watch time / qualified view opportunities",
  completion: "Completed qualified views / qualified views",
  uniqueAudience: "Unique qualified viewers / qualified views",
  shares: "Qualified shares / qualified views",
  meaningfulComments: "Meaningful comments / qualified views",
  returningViewers: "Returning qualified viewers / unique qualified viewers",
  followsGenerated: "Qualified follows generated / qualified views",
};

export function isMetricKey(value: unknown): value is CreatorMetricKey {
  return METRIC_KEYS.includes(value as CreatorMetricKey);
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}