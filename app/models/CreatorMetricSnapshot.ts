import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { CreatorMetricKey } from "./RevenueConfiguration";

export type CreatorRevenueState =
  | "ESTIMATED"
  | "PENDING_REVIEW"
  | "FINALIZED"
  | "RELEASED"
  | "WITHDRAWN"
  | "FROZEN"
  | "REJECTED";

export interface ICreatorMetricSnapshot extends Document {
  cycleId: Types.ObjectId;
  creatorId: Types.ObjectId;
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
  activeDays: number;
  qualityFactor: number;
  riskScore: number;
  riskSignals: string[];
  metricScores: Record<CreatorMetricKey, number>;
  weightedParts: Record<CreatorMetricKey, number>;
  score: number;
  eligible: boolean;
  ineligibilityReasons: string[];
  revenueState: CreatorRevenueState;
  sharePercent: number;
  revenuePaise: number;
  currency: "INR";
  createdAt: Date;
  updatedAt: Date;
}

const CreatorMetricSnapshotSchema = new Schema<ICreatorMetricSnapshot>(
  {
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: "CreatorEarningCycle",
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    qualifiedViews: { type: Number, default: 0, min: 0 },
    qualifiedWatchMs: { type: Number, default: 0, min: 0 },
    qualifiedWatchOpportunityMs: { type: Number, default: 0, min: 0 },
    completedViews: { type: Number, default: 0, min: 0 },
    uniqueViewers: { type: Number, default: 0, min: 0 },
    returningViewers: { type: Number, default: 0, min: 0 },
    meaningfulComments: { type: Number, default: 0, min: 0 },
    qualifiedShares: { type: Number, default: 0, min: 0 },
    qualifiedFollows: { type: Number, default: 0, min: 0 },
    qualifiedLikes: { type: Number, default: 0, min: 0 },
    activeDays: { type: Number, default: 0, min: 0 },
    qualityFactor: { type: Number, default: 1, min: 0, max: 1 },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskSignals: [{ type: String }],
    metricScores: { type: Schema.Types.Mixed, default: {} },
    weightedParts: { type: Schema.Types.Mixed, default: {} },
    score: { type: Number, default: 0, min: 0 },
    eligible: { type: Boolean, default: false },
    ineligibilityReasons: [{ type: String }],
    revenueState: {
      type: String,
      enum: [
        "ESTIMATED",
        "PENDING_REVIEW",
        "FINALIZED",
        "RELEASED",
        "WITHDRAWN",
        "FROZEN",
        "REJECTED",
      ],
      default: "ESTIMATED",
      index: true,
    },
    sharePercent: { type: Number, default: 0, min: 0 },
    revenuePaise: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ["INR"], default: "INR" },
  },
  { timestamps: true, minimize: false }
);

CreatorMetricSnapshotSchema.index(
  { cycleId: 1, creatorId: 1 },
  { unique: true }
);
CreatorMetricSnapshotSchema.index({ creatorId: 1, cycleId: -1 });
CreatorMetricSnapshotSchema.index({
  cycleId: 1,
  revenueState: 1,
  score: -1,
});

const CreatorMetricSnapshot: Model<ICreatorMetricSnapshot> =
  mongoose.models.CreatorMetricSnapshot ||
  mongoose.model<ICreatorMetricSnapshot>(
    "CreatorMetricSnapshot",
    CreatorMetricSnapshotSchema
  );

export default CreatorMetricSnapshot;