import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { CreatorMetricKey } from "./RevenueConfiguration";
import type { CreatorRevenueState } from "./CreatorMetricSnapshot";

export interface ICreatorRevenueAllocation extends Document {
  cycleId: Types.ObjectId;
  creatorId: Types.ObjectId;
  cycleLabel: string;
  cycleStartDate: Date;
  cycleEndDate: Date;
  score: number;
  metricScores: Record<CreatorMetricKey, number>;
  weightSnapshot: Record<CreatorMetricKey, number>;
  totalEligibleScores: number;
  poolPaise: number;
  creatorShareFraction: number;
  creatorSharePercent: number;
  finalRevenuePaise: number;
  currency: "INR";
  revenueState: CreatorRevenueState;
  createdAt: Date;
  finalizedAt: Date;
  releasedAt?: Date | null;
  withdrawnAt?: Date | null;
}

const CreatorRevenueAllocationSchema = new Schema<ICreatorRevenueAllocation>(
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
    cycleLabel: { type: String, required: true },
    cycleStartDate: { type: Date, required: true },
    cycleEndDate: { type: Date, required: true },
    score: { type: Number, required: true, min: 0 },
    metricScores: { type: Schema.Types.Mixed, required: true },
    weightSnapshot: { type: Schema.Types.Mixed, required: true },
    totalEligibleScores: { type: Number, required: true, min: 0 },
    poolPaise: { type: Number, required: true, min: 0 },
    creatorShareFraction: { type: Number, required: true, min: 0 },
    creatorSharePercent: { type: Number, required: true, min: 0 },
    finalRevenuePaise: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["INR"], default: "INR" },
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
      default: "FINALIZED",
      index: true,
    },
    finalizedAt: { type: Date, required: true },
    releasedAt: { type: Date, default: null },
    withdrawnAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false }
);

CreatorRevenueAllocationSchema.index(
  { cycleId: 1, creatorId: 1 },
  { unique: true }
);
CreatorRevenueAllocationSchema.index({ creatorId: 1, cycleLabel: -1 });

const CreatorRevenueAllocation: Model<ICreatorRevenueAllocation> =
  mongoose.models.CreatorRevenueAllocation ||
  mongoose.model<ICreatorRevenueAllocation>(
    "CreatorRevenueAllocation",
    CreatorRevenueAllocationSchema
  );

export default CreatorRevenueAllocation;