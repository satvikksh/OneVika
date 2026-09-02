import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPremiumPlan extends Document {
  key: string;
  name: string;
  description?: string;
  pricePaise: number;
  currency: "INR";
  durationDays: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const PremiumPlanSchema = new Schema<IPremiumPlan>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
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
    durationDays: {
      type: Number,
      required: true,
      min: 1,
      default: 30,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

PremiumPlanSchema.index({ isActive: 1, displayOrder: 1 });

export const PremiumPlan: Model<IPremiumPlan> =
  mongoose.models.PremiumPlan || mongoose.model<IPremiumPlan>("PremiumPlan", PremiumPlanSchema);

export default PremiumPlan;