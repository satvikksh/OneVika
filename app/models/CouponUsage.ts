import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICouponUsage extends Document {
  couponId: mongoose.Types.ObjectId;
  couponCode: string;
  userId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  premiumPlanKey: string;
  originalAmountPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
  usedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    couponCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
      unique: true,
    },
    premiumPlanKey: {
      type: String,
      required: true,
    },
    originalAmountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    finalAmountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const CouponUsage: Model<ICouponUsage> =
  mongoose.models.CouponUsage ||
  mongoose.model<ICouponUsage>("CouponUsage", CouponUsageSchema);

export default CouponUsage;