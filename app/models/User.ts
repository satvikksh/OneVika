import mongoose, { Schema, Model, Document, Types } from "mongoose";

/* =======================
   🎨 1️⃣ Theme Interface
======================= */
export interface IUITheme {
  background: string;
  card: string;
  accent: string;
  text: string;
  radius: string;
}

/* =======================
   👤 2️⃣ User Interface
======================= */
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  provider: "credentials" | "google";
  image?: string;
   fcmToken?: string;

  isPrivate: boolean;
  cover?: string;
  avatar?: string;
  bio?: string;

  sessionVersion: number;
  likedPosts: mongoose.Types.ObjectId[];

  followers: Types.ObjectId[];
  following: Types.ObjectId[];

  // 💎 PREMIUM SYSTEM
  isPremium: boolean;
  premiumExpiresAt?: Date;
  uiTheme?: IUITheme | null;

  createdAt: Date;
  updatedAt: Date;
}

/* =======================
   🧠 3️⃣ User Schema
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

    password: {
      type: String,
      required: false,
    },

    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },

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

    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 💎 PREMIUM SYSTEM

    isPremium: {
      type: Boolean,
      default: false,
    },

    premiumExpiresAt: {
      type: Date,
    },

    uiTheme: {
      type: Object,
      default: null,
    },
    fcmToken: {
  type: String,
  default: null,
},
  },
  { timestamps: true }
);



/* =======================
   5️⃣ Export Model (Next.js Safe)
======================= */

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
