import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema({
  title: String,
  topic: String,
  activeUsers: Number,
  thoughts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Thought" }]
}, { timestamps: true });

export default mongoose.models.Room ||
  mongoose.model("Room", RoomSchema);
