import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type ActivityQuality = "VALID" | "SUSPICIOUS" | "REJECTED";

export interface IViewerActivity extends Document {
  creatorId: Types.ObjectId;
  contentId: Types.ObjectId;
  viewerId: Types.ObjectId;
  day: string;
  viewStarts: number;
  qualifiedViews: number;
  watchMs: number;
  qualifiedWatchMs: number;
  opportunityMs: number;
  completedViews: number;
  shares: number;
  qualifiedShares: number;
  comments: number;
  meaningfulComments: number;
  likes: number;
  qualifiedLikes: number;
  follows: number;
  qualifiedFollows: number;
  lastSeenAt: Date;
  highestQuality: ActivityQuality;
  flagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ViewerActivitySchema = new Schema<IViewerActivity>(
  {
    creatorId: {
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
    viewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    day: {
      type: String,
      required: true,
    },
    viewStarts: { type: Number, default: 0, min: 0 },
    qualifiedViews: { type: Number, default: 0, min: 0 },
    watchMs: { type: Number, default: 0, min: 0 },
    qualifiedWatchMs: { type: Number, default: 0, min: 0 },
    opportunityMs: { type: Number, default: 0, min: 0 },
    completedViews: { type: Number, default: 0, min: 0 },
    shares: { type: Number, default: 0, min: 0 },
    qualifiedShares: { type: Number, default: 0, min: 0 },
    comments: { type: Number, default: 0, min: 0 },
    meaningfulComments: { type: Number, default: 0, min: 0 },
    likes: { type: Number, default: 0, min: 0 },
    qualifiedLikes: { type: Number, default: 0, min: 0 },
    follows: { type: Number, default: 0, min: 0 },
    qualifiedFollows: { type: Number, default: 0, min: 0 },
    lastSeenAt: { type: Date, default: Date.now },
    highestQuality: {
      type: String,
      enum: ["VALID", "SUSPICIOUS", "REJECTED"],
      default: "VALID",
    },
    flagged: { type: Boolean, default: false },
  },
  { timestamps: true, minimize: false }
);

ViewerActivitySchema.index(
  { creatorId: 1, contentId: 1, viewerId: 1, day: 1 },
  { unique: true }
);
ViewerActivitySchema.index({ creatorId: 1, day: 1 });
ViewerActivitySchema.index({ day: 1 });
ViewerActivitySchema.index({ viewerId: 1, day: 1 });
ViewerActivitySchema.index({ contentId: 1 });

const ViewerActivity: Model<IViewerActivity> =
  mongoose.models.ViewerActivity ||
  mongoose.model<IViewerActivity>("ViewerActivity", ViewerActivitySchema);

export default ViewerActivity;