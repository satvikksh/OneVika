// models/UserMood.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserMood extends Document {
  userId: string;
  mood: string;
  energy: number;
  dayKey: string; // YYYY-MM-DD
  createdAt: Date;
}

const UserMoodSchema = new Schema<IUserMood>({
  userId: { type: String, required: true, index: true },
  mood: { type: String, required: true },
  energy: { type: Number, required: true },

  // 👇 ensures one mood per day
  dayKey: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
});

// 🔐 enforce uniqueness
UserMoodSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

const UserMood: Model<IUserMood> =
  mongoose.models.UserMood ||
  mongoose.model<IUserMood>("UserMood", UserMoodSchema);

export default UserMood;
