import mongoose, { Schema, Model, Document } from "mongoose";

/* ===============================
   TypeScript Interface
================================ */
export interface IDailyDropResponse extends Document {
  userId: string;
  userName: string;
  mood: string;
  response: string;
  createdAt: Date;
}

/* ===============================
   Schema with TTL
================================ */
const DailyDropResponseSchema = new Schema<IDailyDropResponse>({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  mood: { type: String, required: true },
  response: { type: String, required: true },

  // ⏱ TTL field
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24, // 24 HOURS
  },
});

/* ===============================
   Model
================================ */
const DailyDropResponse: Model<IDailyDropResponse> =
  mongoose.models.DailyDropResponse ||
  mongoose.model<IDailyDropResponse>(
    "DailyDropResponse",
    DailyDropResponseSchema
  );

export default DailyDropResponse;
