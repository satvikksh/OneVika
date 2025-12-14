import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },

    // NEW FIELDS
    avatar: { type: String },       // URL (public/uploads/avatars/ or initials fallback)
    bio: { type: String, default: "" },
    likedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
  },
  { timestamps: true }
  
);


export default models.User || model("User", UserSchema);
