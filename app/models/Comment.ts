import mongoose, { Schema, model, models } from "mongoose";

const CommentSchema = new Schema(
  {
    id: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

export default models.Comment || model("Comment", CommentSchema);
