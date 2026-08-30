import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CreatorEarningTransactionType =
  | "RELEASE"
  | "WITHDRAWAL"
  | "REFUND"
  | "ADJUSTMENT";

export type CreatorEarningTransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REVERSED";

export interface ICreatorEarningTransaction extends Document {
  creatorId: Types.ObjectId;
  cycleId: Types.ObjectId;
  allocationId: Types.ObjectId;
  withdrawalId?: Types.ObjectId | null;
  type: CreatorEarningTransactionType;
  amountPaise: number;
  currency: "INR";
  status: CreatorEarningTransactionStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CreatorEarningTransactionSchema = new Schema<ICreatorEarningTransaction>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: "CreatorEarningCycle",
      required: true,
      index: true,
    },
    allocationId: {
      type: Schema.Types.ObjectId,
      ref: "CreatorRevenueAllocation",
      required: true,
      index: true,
    },
    withdrawalId: {
      type: Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["RELEASE", "WITHDRAWAL", "REFUND", "ADJUSTMENT"],
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    currency: { type: String, enum: ["INR"], default: "INR" },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
      default: "COMPLETED",
      index: true,
    },
    description: { type: String, trim: true, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

CreatorEarningTransactionSchema.index(
  { allocationId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: { $in: ["RELEASE", "WITHDRAWAL", "REFUND"] },
    },
  }
);
CreatorEarningTransactionSchema.index({ withdrawalId: 1, type: 1 });

const CreatorEarningTransaction: Model<ICreatorEarningTransaction> =
  mongoose.models.CreatorEarningTransaction ||
  mongoose.model<ICreatorEarningTransaction>(
    "CreatorEarningTransaction",
    CreatorEarningTransactionSchema
  );

export default CreatorEarningTransaction;