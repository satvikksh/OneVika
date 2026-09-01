import mongoose, { Document, Model, Schema } from "mongoose";

export type PaymentMethodStatus = "active" | "inactive" | "disabled";

export interface IPaymentMethod extends Document {
  name: string;
  type: "upi" | "bank_transfer" | "card" | "wallet" | "manual" | "cashfree";
  status: PaymentMethodStatus;
  currency: "INR";
  configuration?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["upi", "bank_transfer", "card", "wallet", "manual", "cashfree"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "disabled"],
      default: "active",
    },
    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },
    configuration: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const PaymentMethod: Model<IPaymentMethod> =
  mongoose.models.PaymentMethod ||
  mongoose.model<IPaymentMethod>("PaymentMethod", PaymentMethodSchema);

export default PaymentMethod;