import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type OrderStatus =
  | "PENDING"
  | "PAYMENT_PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

export interface IOrder extends Document {
  orderId: string;
  userId: Types.ObjectId;
  productType: "membership" | "wallet_credit" | "other";
  membershipPlan?: string;
  amountPaise: number;
  currency: "INR";
  status: OrderStatus;
  paymentTransactionId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productType: {
      type: String,
      enum: ["membership", "wallet_credit", "other"],
      required: true,
      default: "membership",
    },
    membershipPlan: {
      type: String,
      trim: true,
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
        "PAYMENT_PROCESSING",
        "PAID",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
        "REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },
    paymentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      index: true,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
