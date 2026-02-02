import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStory extends Document {
  userId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  mood: number;
  createdAt: Date;
  expiresAt: Date;
}

const StorySchema = new Schema<IStory>({
  userId: { type: String, required: true, index: true },

  text: { type: String, required: true, maxlength: 200 },

  mediaUrl: { type: String },
  mediaType: { type: String, enum: ["image", "video"] },

  mood: { type: Number, min: 1, max: 5 },

  createdAt: { type: Date, default: Date.now },

  // 🔥 AUTO DELETE AFTER 24 HOURS
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expires: 0 },
  },
});

const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>("Story", StorySchema);

export default Story;
