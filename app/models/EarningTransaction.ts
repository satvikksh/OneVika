import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type EarningTransactionType =
  | "EARNING"
  | "WITHDRAWAL"
  | "REFUND"
  | "ADJUSTMENT";

export type EarningTransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REVERSED";

export interface IEarningTransaction extends Document {
  userId: Types.ObjectId;
  type: EarningTransactionType;
  amountPaise: number;
  currency: "INR";
  status: EarningTransactionStatus;
  likeId?: string | null;
  contentId?: Types.ObjectId | null;
  withdrawalId?: Types.ObjectId | null;
  earningCycleId?: Types.ObjectId | null;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const EarningTransactionSchema = new Schema<IEarningTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["EARNING", "WITHDRAWAL", "REFUND", "ADJUSTMENT"],
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
      default: "COMPLETED",
      index: true,
    },
    likeId: {
      type: String,
      default: null,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      default: null,
      index: true,
    },
    withdrawalId: {
      type: Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
      index: true,
    },
    earningCycleId: {
      type: Schema.Types.ObjectId,
      ref: "EarningCycle",
      default: null,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

EarningTransactionSchema.index(
  { likeId: 1 },
  {
    unique: true,
    partialFilterExpression: { likeId: { $type: "string" } },
  }
);

EarningTransactionSchema.index(
  { withdrawalId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "WITHDRAWAL" },
  }
);

EarningTransactionSchema.index({ type: 1, status: 1, createdAt: -1 });

const EarningTransaction: Model<IEarningTransaction> =
  mongoose.models.EarningTransaction ||
  mongoose.model<IEarningTransaction>(
    "EarningTransaction",
    EarningTransactionSchema
  );

export default EarningTransaction;
