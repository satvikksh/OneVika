import mongoose from "mongoose";

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

export default mongoose.models.Thought ||
  mongoose.model("Thought", ThoughtSchema);
