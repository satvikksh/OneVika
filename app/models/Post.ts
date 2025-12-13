import mongoose, { Schema, models } from "mongoose";

const PostSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    images: [
      {
        type: String, // URLs or filenames
      },
    ],

    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    likedCount: {
      type: Number,
      default: 0,
    },

    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Post = models.Post || mongoose.model("Post", PostSchema);
export default Post;
