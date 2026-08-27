import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type EarningCycleStatus =
  | "OPEN"
  | "WITHDRAWAL_REQUESTED"
  | "APPROVED"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REJECTED"
  | "REVERSED";

export interface IEarningCycle extends Document {
  userId: Types.ObjectId;
  cycleStart: Date;
  cycleEnd?: Date | null;
  eligibleLikes: number;
  earnedAmountPaise: number;
  withdrawalId?: Types.ObjectId | null;
  status: EarningCycleStatus;
  createdAt: Date;
  updatedAt: Date;
}

const EarningCycleSchema = new Schema<IEarningCycle>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cycleStart: {
      type: Date,
      default: Date.now,
      required: true,
    },
    cycleEnd: {
      type: Date,
      default: null,
    },
    eligibleLikes: {
      type: Number,
      default: 0,
      min: 0,
    },
    earnedAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    withdrawalId: {
      type: Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
    },
    status: {
      type: String,
      enum: [
        "OPEN",
        "WITHDRAWAL_REQUESTED",
        "APPROVED",
        "PROCESSING",
        "PAID",
        "FAILED",
        "REJECTED",
        "REVERSED",
      ],
      default: "OPEN",
      index: true,
    },
  },
  { timestamps: true }
);

EarningCycleSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "OPEN" },
  }
);

const EarningCycle: Model<IEarningCycle> =
  mongoose.models.EarningCycle ||
  mongoose.model<IEarningCycle>("EarningCycle", EarningCycleSchema);

export default EarningCycle;
