import mongoose, { Document, Model, Schema } from "mongoose";

export type RefundStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED";

export interface IPaymentRefund extends Document {
  refundId: string;
  paymentTransactionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amountPaise: number;
  currency: "INR";
  reason?: string;
  status: RefundStatus;
  adminNote?: string;
  providerReference?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

const PaymentRefundSchema = new Schema<IPaymentRefund>(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    reason: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "UNDER_REVIEW",
        "APPROVED",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "REJECTED",
      ],
      default: "REQUESTED",
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
    },
    providerReference: {
      type: String,
    },
  },
  { timestamps: true }
);

PaymentRefundSchema.index({ refundId: 1 }, { unique: true });
PaymentRefundSchema.index({ userId: 1, status: 1 });
PaymentRefundSchema.index({ status: 1, createdAt: -1 });

export const PaymentRefund: Model<IPaymentRefund> =
  mongoose.models.PaymentRefund ||
  mongoose.model<IPaymentRefund>("PaymentRefund", PaymentRefundSchema);

export default PaymentRefund;