import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
    },

    // 🔑 OPTIONAL password (IMPORTANT for Google users)
    password: {
      type: String,
      required: false,
    },

    // 🔐 auth provider
    provider: {
      type: String,
      default: "credentials", // "google" for Google users
    },

    // 🖼️ Google profile image
    image: {
      type: String,
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    cover: {
      type: String,
      default: "",
    },

    avatar: {
      type: String,
    },

    bio: {
      type: String,
      default: "",
    },

   sessionVersion: {
  type: Number,
  default: 0,
},


    likedPosts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
  },
  { timestamps: true }
);

// 🔁 Prevent model overwrite in Next.js
export default mongoose.models.User || mongoose.model("User", UserSchema);
