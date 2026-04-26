import mongoose, { Model, Types } from "mongoose";

export interface IThought {
  title?: string;
  content?: string;
  tags?: string[];
  mood?: "creative" | "logical" | "reflective";
  createdBy?: Types.ObjectId;
  connections?: Array<{
    target: Types.ObjectId;
    type: string;
  }>;
  embedding?: number[];
  impactScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ThoughtSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    tags: [String],
    mood: {
      type: String,
      enum: ["creative", "logical", "reflective"],
      default: "logical",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    connections: [
      {
        target: mongoose.Schema.Types.ObjectId,
        type: String, // support | oppose | expand
      },
    ],
    embedding: [Number],
    impactScore: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const Thought =
  (mongoose.models.Thought as Model<IThought> | undefined) ||
  mongoose.model<IThought>("Thought", ThoughtSchema);

export default Thought;
