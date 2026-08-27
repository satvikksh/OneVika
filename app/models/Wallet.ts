import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IWallet extends Document {
  userId: Types.ObjectId;
  availableBalancePaise: number;
  totalEarnedPaise: number;
  totalWithdrawnPaise: number;
  currency: "INR";
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    availableBalancePaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarnedPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWithdrawnPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },
  },
  { timestamps: true }
);

const Wallet: Model<IWallet> =
  mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", WalletSchema);

export default Wallet;
