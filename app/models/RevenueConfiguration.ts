import mongoose, { Document, Model, Schema } from "mongoose";

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

export type CreatorActivityType =
  | "view_start"
  | "watch"
  | "complete"
  | "like"
  | "comment"
  | "follow"
  | "share";

export type ActivityQuality = "VALID" | "SUSPICIOUS" | "REJECTED";

export interface MetricNormalizationRule {
  weight: number;
  rateCap: number;
  curvePower: number;
  minCount: number;
}

export interface ViewQualityRule {
  enabled: boolean;
  minWatchMs: number;
  completionWatchMs: number;
  completionPercent: number;
  maxViewsPerViewerPerContentPerDay: number;
  maxWatchSessionsPerViewerPerContentPerDay: number;
  minViewerAccountAgeSeconds: number;
  maxSelfViewsPerContent: number;
  watchMsOverDurationTolerance: number;
  shortViewIgnoreRatio: number;
}

export interface CommentQualityRule {
  enabled: boolean;
  minLength: number;
  maxLength: number;
  repeatedCharRatioCap: number;
  emojiRatioCap: number;
  uppercaseRatioCap: number;
  maxDuplicatesPerUserPerContent: number;
  bannedPatterns: string[];
  promotionalPatterns: string[];
  minCommentFloor: number;
}

export interface EligibilityRule {
  minAccountAgeDays: number;
  minQualifiedViews: number;
  minFollowers: number;
  minQualifiedWatchSeconds: number;
  minEarningScore: number;
  verifiedOnly: boolean;
  maxFraudRisk: number;
  requireGoodStanding: boolean;
  requireContentPolicyCompliant: boolean;
  requireApprovedCreator: boolean;
}

export interface RevenuePoolRule {
  currency: "INR";
  totalPlatformRevenuePaise: number;
  eligibleRevenuePaise: number;
  creatorPoolPercentage: number;
  poolOverridePaise: number | null;
  defaultMonthlyPoolPaise: number;
}

export interface IRevenueConfiguration extends Document {
  key: "creator-revenue";
  enabled: boolean;
  weights: Record<CreatorMetricKey, number>;
  normalization: Record<CreatorMetricKey, MetricNormalizationRule>;
  viewQuality: ViewQualityRule;
  commentQuality: CommentQualityRule;
  eligibility: EligibilityRule;
  pool: RevenuePoolRule;
  minimumWithdrawalPaise: number;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_WEIGHTS: Record<CreatorMetricKey, number> = {
  watchQuality: 30,
  completion: 20,
  uniqueAudience: 15,
  shares: 10,
  meaningfulComments: 10,
  returningViewers: 10,
  followsGenerated: 5,
};

export const DEFAULT_NORMALIZATION: Record<CreatorMetricKey, MetricNormalizationRule> = {
  watchQuality: { weight: 30, rateCap: 1, curvePower: 1, minCount: 0 },
  completion: { weight: 20, rateCap: 0.95, curvePower: 1, minCount: 1 },
  uniqueAudience: { weight: 15, rateCap: 1, curvePower: 1, minCount: 0 },
  shares: { weight: 10, rateCap: 0.2, curvePower: 1, minCount: 1 },
  meaningfulComments: { weight: 10, rateCap: 0.3, curvePower: 1, minCount: 1 },
  returningViewers: { weight: 10, rateCap: 1, curvePower: 1, minCount: 1 },
  followsGenerated: { weight: 5, rateCap: 0.1, curvePower: 1, minCount: 1 },
};

export const DEFAULT_VIEW_QUALITY: ViewQualityRule = {
  enabled: true,
  minWatchMs: 3000,
  completionWatchMs: 15000,
  completionPercent: 0.8,
  maxViewsPerViewerPerContentPerDay: 50,
  maxWatchSessionsPerViewerPerContentPerDay: 120,
  minViewerAccountAgeSeconds: 60,
  maxSelfViewsPerContent: 3,
  watchMsOverDurationTolerance: 1.15,
  shortViewIgnoreRatio: 0.1,
};

export const DEFAULT_COMMENT_QUALITY: CommentQualityRule = {
  enabled: true,
  minLength: 3,
  maxLength: 1200,
  repeatedCharRatioCap: 0.5,
  emojiRatioCap: 0.6,
  uppercaseRatioCap: 0.8,
  maxDuplicatesPerUserPerContent: 1,
  bannedPatterns: [
    "\\b(free\\s+follow)\\b",
    "\\b(follow\\s+for\\s+follow)\\b",
    "\\b(buy\\s+followers)\\b",
    "\\b(100%\\s+real)\\b",
    "\\b(click\\s+link)\\b",
    "PromoCode\\s+#?\\w+",
  ],
  promotionalPatterns: [
    "\\b(buy|sell|discount|fastest|guaranteed)\\b",
    "\\b(win\\s+prize|click\\s+here|visit\\s+link)\\b",
    "\\b(promo\\s+code|sponsor|collab\\?\\s*DM)\\b",
  ],
  minCommentFloor: 1,
};

export const DEFAULT_ELIGIBILITY: EligibilityRule = {
  minAccountAgeDays: 30,
  minQualifiedViews: 100,
  minFollowers: 50,
  minQualifiedWatchSeconds: 600,
  minEarningScore: 0,
  verifiedOnly: false,
  maxFraudRisk: 60,
  requireGoodStanding: false,
  requireContentPolicyCompliant: false,
  requireApprovedCreator: false,
};

export const DEFAULT_POOL: RevenuePoolRule = {
  currency: "INR",
  totalPlatformRevenuePaise: 0,
  eligibleRevenuePaise: 0,
  creatorPoolPercentage: 5,
  poolOverridePaise: null,
  defaultMonthlyPoolPaise: 10000000, // ₹1,00,000
};

export function defaultRevenueConfiguration() {
  return {
    key: "creator-revenue" as const,
    enabled: true,
    weights: { ...DEFAULT_WEIGHTS },
    normalization: Object.fromEntries(
      METRIC_KEYS.map((k) => [k, { ...DEFAULT_NORMALIZATION[k] }])
    ) as Record<CreatorMetricKey, MetricNormalizationRule>,
    viewQuality: { ...DEFAULT_VIEW_QUALITY },
    commentQuality: { ...DEFAULT_COMMENT_QUALITY },
    eligibility: { ...DEFAULT_ELIGIBILITY },
    pool: { ...DEFAULT_POOL },
    minimumWithdrawalPaise: 10000,
  };
}

const RevenueConfigurationSchema = new Schema<IRevenueConfiguration>(
  {
    key: {
      type: String,
      enum: ["creator-revenue"],
      default: "creator-revenue",
      unique: true,
      index: true,
    },
    enabled: { type: Boolean, default: true },
    weights: {
      type: Schema.Types.Mixed,
      required: true,
    },
    normalization: {
      type: Schema.Types.Mixed,
      required: true,
    },
    viewQuality: {
      type: Schema.Types.Mixed,
      required: true,
    },
    commentQuality: {
      type: Schema.Types.Mixed,
      required: true,
    },
    eligibility: {
      type: Schema.Types.Mixed,
      required: true,
    },
    pool: {
      type: Schema.Types.Mixed,
      required: true,
    },
    minimumWithdrawalPaise: {
      type: Number,
      default: 10000,
      min: 1,
    },
  },
  { timestamps: true, minimize: false }
);

const RevenueConfiguration: Model<IRevenueConfiguration> =
  mongoose.models.RevenueConfiguration ||
  mongoose.model<IRevenueConfiguration>(
    "RevenueConfiguration",
    RevenueConfigurationSchema
  );

export default RevenueConfiguration;