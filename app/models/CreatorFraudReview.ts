import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FraudReviewStatus =
  | "UNDER_REVIEW"
  | "APPROVED"
  | "FROZEN"
  | "REJECTED"
  | "RELEASED";

export interface FraudSignal {
  name: string;
  detected: boolean;
  weight: number;
  description: string;
}

export interface ICreatorFraudReview extends Document {
  creatorId: Types.ObjectId;
  cycleId: Types.ObjectId;
  riskScore: number;
  qualifiedViews: number;
  rejectedViews: number;
  suspiciousViews: number;
  watchMs: number;
  signalDetail: Record<string, number>;
  signals: FraudSignal[];
  status: FraudReviewStatus;
  decidedBy?: Types.ObjectId | null;
  decidedAt?: Date | null;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FraudSignalSchema = new Schema<FraudSignal>(
  {
    name: { type: String, required: true },
    detected: { type: Boolean, default: false },
    weight: { type: Number, default: 0 },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const CreatorFraudReviewSchema = new Schema<ICreatorFraudReview>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: "CreatorEarningCycle",
      required: true,
      index: true,
    },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    qualifiedViews: { type: Number, default: 0, min: 0 },
    rejectedViews: { type: Number, default: 0, min: 0 },
    suspiciousViews: { type: Number, default: 0, min: 0 },
    watchMs: { type: Number, default: 0, min: 0 },
    signalDetail: { type: Schema.Types.Mixed, default: {} },
    signals: { type: [FraudSignalSchema], default: [] },
    status: {
      type: String,
      enum: ["UNDER_REVIEW", "APPROVED", "FROZEN", "REJECTED", "RELEASED"],
      default: "UNDER_REVIEW",
      index: true,
    },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true, minimize: false }
);

CreatorFraudReviewSchema.index({ cycleId: 1, riskScore: -1 });

const CreatorFraudReview: Model<ICreatorFraudReview> =
  mongoose.models.CreatorFraudReview ||
  mongoose.model<ICreatorFraudReview>(
    "CreatorFraudReview",
    CreatorFraudReviewSchema
  );

export default CreatorFraudReview;