import mongoose, { Document, Model, Schema } from "mongoose";

export type PremiumMembershipStatus =
  | "PENDING"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "SUSPENDED";

export interface IPremiumMembership extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  planKey: string;
  planName?: string;
  orderId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  pricePaise: number;
  currency: "INR";
  status: PremiumMembershipStatus;
  activationType: "payment" | "admin_manual";
  startDate: Date;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PremiumMembershipSchema = new Schema<IPremiumMembership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "PremiumPlan",
      required: true,
    },
    planKey: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
    },
    pricePaise: {
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
      enum: ["PENDING", "ACTIVE", "EXPIRED", "CANCELLED", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
    activationType: {
      type: String,
      enum: ["payment", "admin_manual"],
      default: "payment",
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate active memberships from the same transaction.
PremiumMembershipSchema.index({ transactionId: 1 }, { unique: true });
PremiumMembershipSchema.index({ userId: 1, status: 1 });
PremiumMembershipSchema.index({ userId: 1, expiryDate: -1 });

export const PremiumMembership: Model<IPremiumMembership> =
  mongoose.models.PremiumMembership ||
  mongoose.model<IPremiumMembership>("PremiumMembership", PremiumMembershipSchema);

export default PremiumMembership;
