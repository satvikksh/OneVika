import mongoose, { Schema, Document, Types } from "mongoose";

export interface IComment extends Document {
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Comment ||
  mongoose.model<IComment>("Comment", CommentSchema);
