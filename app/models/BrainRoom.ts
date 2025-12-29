import mongoose from "mongoose";

const BrainRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, unique: true },
    title: String,
    topic: String,
    activeUsers: { type: Number, default: 0 },
    thoughts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Thought" }],
  },
  { timestamps: true }
);

export default mongoose.models.BrainRoom ||
  mongoose.model("BrainRoom", BrainRoomSchema);
