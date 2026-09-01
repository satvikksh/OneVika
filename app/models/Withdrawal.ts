import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED"
  | "REVERSED";

export type PayoutMethodType = "UPI" | "BANK";

export interface IWithdrawal extends Document {
  userId: Types.ObjectId;
  amountPaise: number;
  currency: "INR";
  status: WithdrawalStatus;
  payoutMethod: PayoutMethodType;
  payoutProvider: "manual";
  providerPayoutId?: string | null;
  idempotencyKey: string;
  earningCycleId?: Types.ObjectId | null;
  creatorAllocationIds?: Types.ObjectId[] | null;
  eligibleLikes: number;
  payoutDetailsEncrypted: string;
  payoutDetailsMasked: string;
  failureReason?: string;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date | null;
  completedAt?: Date | null;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "REJECTED",
        "CANCELLED",
        "REVERSED",
      ],
      default: "PENDING",
      index: true,
    },
    payoutMethod: {
      type: String,
      enum: ["UPI", "BANK"],
      required: true,
    },
    payoutProvider: {
      type: String,
      enum: ["manual"],
      default: "manual",
    },
    providerPayoutId: {
      type: String,
      default: null,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    earningCycleId: {
      type: Schema.Types.ObjectId,
      ref: "EarningCycle",
      default: null,
      index: true,
    },
    creatorAllocationIds: {
      type: [Schema.Types.ObjectId],
      ref: "CreatorRevenueAllocation",
      default: null,
      index: true,
    },
    eligibleLikes: {
      type: Number,
      required: true,
      min: 0,
    },
    payoutDetailsEncrypted: {
      type: String,
      required: true,
      select: false,
    },
    payoutDetailsMasked: {
      type: String,
      required: true,
    },
    failureReason: {
      type: String,
      trim: true,
      default: "",
    },
    adminNote: {
      type: String,
      trim: true,
      default: "",
    },
    processedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

WithdrawalSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["PENDING", "APPROVED", "PROCESSING"] },
    },
  }
);
WithdrawalSchema.index({ createdAt: -1 });
WithdrawalSchema.index({ status: 1, completedAt: -1 });

const Withdrawal: Model<IWithdrawal> =
  mongoose.models.Withdrawal ||
  mongoose.model<IWithdrawal>("Withdrawal", WithdrawalSchema);

export default Withdrawal;
