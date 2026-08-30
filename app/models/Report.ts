import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Hate or Abuse",
  "Nudity or Sexual Content",
  "Violence",
  "Misinformation",
  "Copyright",
  "Scam or Fraud",
  "Other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["PENDING", "REVIEWING", "DISMISSED", "RESOLVED"] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_ACTIONS = [
  "review",
  "dismiss",
  "remove",
  "warn",
  "restrict",
  "ban",
] as const;

export type ReportAction = (typeof REPORT_ACTIONS)[number];

export interface IReport extends Document {
  reporterId: Types.ObjectId;
  reportedUserId: Types.ObjectId;
  contentId: Types.ObjectId;
  contentType: "post" | "video";
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  reviewNote: string;
  actionTaken: string;
  decidedBy: Types.ObjectId | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    contentType: {
      type: String,
      enum: ["post", "video"],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1200,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: "PENDING",
      index: true,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: "",
    },
    actionTaken: {
      type: String,
      trim: true,
      default: "",
    },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ReportSchema.index({ reporterId: 1, contentId: 1 }, { unique: true });
ReportSchema.index({ contentId: 1, status: 1 });
ReportSchema.index({ reportedUserId: 1, createdAt: -1 });
ReportSchema.index({ createdAt: -1 });

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);

export default Report;