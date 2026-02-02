import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: "image" | "video";
  viewers: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    mediaUrl: {
      type: String,
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    // 👀 Seen / Unseen tracking
    viewers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ⏳ Auto-expire stories (24 hours)
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// 🔥 TTL INDEX (Mongo auto delete)
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>("Story", StorySchema);

export default Story;
