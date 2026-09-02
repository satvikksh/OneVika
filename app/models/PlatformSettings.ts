import mongoose, { Document, Model, Schema } from "mongoose";

export type PayoutProvider = "manual" | "cashfree";

export interface IPlatformSettings extends Document {
  key: "earnings";
  likeRatePaise: number;
  minimumWithdrawalPaise: number;
  maximumWithdrawalPaise?: number | null;
  withdrawalsEnabled: boolean;
  payoutProvider: PayoutProvider;
  maintenanceMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    key: {
      type: String,
      enum: ["earnings"],
      default: "earnings",
      unique: true,
      index: true,
    },
    likeRatePaise: {
      type: Number,
      default: 5,
      min: 1,
    },
    minimumWithdrawalPaise: {
      type: Number,
      default: 10000,
      min: 1,
    },
    maximumWithdrawalPaise: {
      type: Number,
      default: null,
      min: 1,
    },
    withdrawalsEnabled: {
      type: Boolean,
      default: true,
    },
    payoutProvider: {
      type: String,
      enum: ["manual", "cashfree"],
      default: "manual",
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const PlatformSettings: Model<IPlatformSettings> =
  mongoose.models.PlatformSettings ||
  mongoose.model<IPlatformSettings>("PlatformSettings", PlatformSettingsSchema);

export default PlatformSettings;
