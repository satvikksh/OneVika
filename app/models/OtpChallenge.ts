import mongoose, { Model, Schema } from "mongoose";

export type OtpPurpose = "registration" | "password-reset";

export interface IOtpChallenge {
  email: string;
  purpose: OtpPurpose;
  otpHash: string;
  otpSalt: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  resendAvailableAt: Date;
  verifiedAt?: Date | null;
  usedAt?: Date | null;
  resetTokenHash?: string;
  registration?: {
    name: string;
    passwordHash: string;
    avatar?: string;
    securityQuestion: "favoritePet" | "favoriteColor" | "nickname";
    securityAnswer: string;
  };
}

const OtpChallengeSchema = new Schema<IOtpChallenge>(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    purpose: {
      type: String,
      enum: ["registration", "password-reset"],
      required: true,
      index: true,
    },
    otpHash: { type: String, required: true },
    otpSalt: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    resendCount: { type: Number, default: 0 },
    resendAvailableAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
    resetTokenHash: { type: String },
    registration: {
      type: {
        name: { type: String, required: true },
        passwordHash: { type: String, required: true },
        avatar: { type: String, default: "" },
        securityQuestion: {
          type: String,
          enum: ["favoritePet", "favoriteColor", "nickname"],
          required: true,
        },
        securityAnswer: { type: String, required: true },
      },
      required: false,
    },
  },
  { timestamps: true }
);

// MongoDB removes old challenges automatically after the retention window.
OtpChallengeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
OtpChallengeSchema.index({ email: 1, purpose: 1, usedAt: 1 });

const OtpChallenge: Model<IOtpChallenge> =
  mongoose.models.OtpChallenge ||
  mongoose.model<IOtpChallenge>("OtpChallenge", OtpChallengeSchema);

export default OtpChallenge;
