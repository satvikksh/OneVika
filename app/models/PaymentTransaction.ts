import mongoose, { Document, Model, Schema, Types } from "mongoose";
import PaymentMethod, { IPaymentMethod } from "./PaymentMethod";

export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "PROCESSING"
  | "VERIFICATION_REQUIRED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "USER_DROPPED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PaymentProvider = "cashfree" | "paytm";

export interface IPaymentTransaction extends Document {
  transactionId: string;
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  providerOrderId?: string;
  providerPaymentId?: string;
  provider?: PaymentProvider;
  planId?: mongoose.Types.ObjectId;
  amountPaise: number;
  currency: "INR";
  paymentMethod: mongoose.Types.ObjectId | IPaymentMethod;
  status: PaymentStatus;
  purpose: "membership" | "wallet_credit" | "wallet_debit" | "refund" | "payout" | "other";
  providerReference?: string;
  providerTxnId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  paidAt?: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    providerOrderId: {
      type: String,
      index: true,
      sparse: true,
    },
    providerPaymentId: {
      type: String,
      index: true,
      sparse: true,
    },
    provider: {
      type: String,
      enum: ["cashfree", "paytm"],
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "PremiumPlan",
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
    paymentMethod: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
    },
    status: {
      type: String,
      enum: [
        "INITIATED",
        "PENDING",
        "PROCESSING",
        "VERIFICATION_REQUIRED",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
        "USER_DROPPED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ],
      default: "INITIATED",
      index: true,
    },
    purpose: {
      type: String,
      enum: ["membership", "wallet_credit", "wallet_debit", "refund", "payout", "other"],
      required: true,
    },
    providerReference: {
      type: String,
    },
    providerTxnId: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

PaymentTransactionSchema.index({ userId: 1, status: 1 });
PaymentTransactionSchema.index({ status: 1, createdAt: -1 });

export const PaymentTransaction: Model<IPaymentTransaction> =
  mongoose.models.PaymentTransaction ||
  mongoose.model<IPaymentTransaction>("PaymentTransaction", PaymentTransactionSchema);

export default PaymentTransaction;