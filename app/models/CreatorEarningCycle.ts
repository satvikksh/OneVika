import mongoose, { Document, Model, Schema } from "mongoose";
import type {
  CreatorMetricKey,
  EligibilityRule,
  MetricNormalizationRule,
  ViewQualityRule,
  CommentQualityRule,
} from "./RevenueConfiguration";

export type CreatorCycleStatus =
  | "OPEN"
  | "CALCULATING"
  | "UNDER_REVIEW"
  | "FINALIZED"
  | "PAID";

export interface ICreatorEarningCycle extends Document {
  label: string;
  status: CreatorCycleStatus;
  startDate: Date;
  endDate: Date;
  currency: "INR";
  revenuePoolPaise: number;
  totalEligibleCreators: number;
  totalEligibleScores: number;
  totalQualifiedViews: number;
  totalQualifiedWatchMs: number;
  roundingResiduePaise: number;
  weightSnapshot: Record<CreatorMetricKey, number>;
  normalizationSnapshot: Record<CreatorMetricKey, MetricNormalizationRule>;
  viewQualitySnapshot: ViewQualityRule;
  commentQualitySnapshot: CommentQualityRule;
  eligibilitySnapshot: EligibilityRule;
  estimatedTotalScores: number;
  estimatedEligibleCreators: number;
  estimatedPoolPaise: number;
  calculatedAt?: Date | null;
  finalizedAt?: Date | null;
  paidAt?: Date | null;
  releasedRevenuePaise: number;
  createdAt: Date;
  updatedAt: Date;
}

const CreatorEarningCycleSchema = new Schema<ICreatorEarningCycle>(
  {
    label: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "CALCULATING", "UNDER_REVIEW", "FINALIZED", "PAID"],
      default: "OPEN",
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    currency: { type: String, enum: ["INR"], default: "INR" },
    revenuePoolPaise: { type: Number, default: 0, min: 0 },
    totalEligibleCreators: { type: Number, default: 0, min: 0 },
    totalEligibleScores: { type: Number, default: 0, min: 0 },
    totalQualifiedViews: { type: Number, default: 0, min: 0 },
    totalQualifiedWatchMs: { type: Number, default: 0, min: 0 },
    roundingResiduePaise: { type: Number, default: 0, min: 0 },
    weightSnapshot: { type: Schema.Types.Mixed, default: {} },
    normalizationSnapshot: { type: Schema.Types.Mixed, default: {} },
    viewQualitySnapshot: { type: Schema.Types.Mixed, default: {} },
    commentQualitySnapshot: { type: Schema.Types.Mixed, default: {} },
    eligibilitySnapshot: { type: Schema.Types.Mixed, default: {} },
    estimatedTotalScores: { type: Number, default: 0, min: 0 },
    estimatedEligibleCreators: { type: Number, default: 0, min: 0 },
    estimatedPoolPaise: { type: Number, default: 0, min: 0 },
    calculatedAt: { type: Date, default: null },
    finalizedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    releasedRevenuePaise: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, minimize: false }
);

CreatorEarningCycleSchema.index({ status: 1, startDate: -1 });
CreatorEarningCycleSchema.index({ startDate: -1 });

const CreatorEarningCycle: Model<ICreatorEarningCycle> =
  mongoose.models.CreatorEarningCycle ||
  mongoose.model<ICreatorEarningCycle>(
    "CreatorEarningCycle",
    CreatorEarningCycleSchema
  );

export default CreatorEarningCycle;