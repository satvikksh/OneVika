import mongoose, { Schema, Model, Document } from "mongoose";

/* =======================
   1️⃣ User Interface
======================= */
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  provider: "credentials" | "google";
  image?: string;
  isPrivate: boolean;
  cover?: string;
  avatar?: string;
  bio?: string;
  sessionVersion: number;
  likedPosts: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

/* =======================
   2️⃣ User Schema
======================= */
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      index: true,
    },

    // 🔑 OPTIONAL password (Google users)
    password: {
      type: String,
      required: false,
    },

    // 🔐 Auth provider
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
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

/* =======================
   3️⃣ Export Model (Next.js Safe)
======================= */
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
