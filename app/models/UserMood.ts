import mongoose, { Schema, Model, Document } from "mongoose";

/* ===============================
   1️⃣ TypeScript Interface
================================ */
export interface IUserMood extends Document {
  userId: string;
  mood: string;
  energy: number;
  createdAt: Date;
}

/* ===============================
   2️⃣ Mongoose Schema
================================ */
const UserMoodSchema = new Schema<IUserMood>({
  userId: { type: String, required: true, index: true },
  mood: { type: String, required: true },
  energy: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

/* ===============================
   3️⃣ Typed Model
================================ */
const UserMood: Model<IUserMood> =
  mongoose.models.UserMood ||
  mongoose.model<IUserMood>("UserMood", UserMoodSchema);

export default UserMood;
