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
  favoritePet?: string;
  favoriteColor?: string;
  nickname?: string;
  provider: "credentials" | "google";
  image?: string;
  isAI?: boolean;
  fcmToken?: string;
  fcmTokens?: string[];
  role: "USER" | "ADMIN";

  // 🚨 MODERATION
  accountStatus: "active" | "warned" | "restricted" | "suspended" | "banned";
  accountStatusReason?: string;
  accountStatusAt?: Date;

  // ✅ ACCOUNT VERIFICATION
  verified: boolean;
  verifiedAt?: Date;

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
  premiumActivatedAt?: Date;
  premiumPlan?: "monthly";
  premiumPaymentProvider?: string;
  premiumLastPaymentAt?: Date;
  premiumLastPaymentIntentId?: string;
  premiumLastCheckoutSessionId?: string;
  premiumExpiryReminderSentAt?: Date;
  premiumExpiryReminderFor?: Date;
  premiumPaymentMethod?: {
    type?: string;
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    vpa?: string;
  } | null;
  uiTheme?: IUITheme | null;

  createdAt: Date;
  updatedAt: Date;
  lastSeen?: Date;
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
    favoritePet: {
      type: String,
      default: "",
      trim: true,
    },
    favoriteColor: {
      type: String,
      default: "",
      trim: true,
    },
    nickname: {
      type: String,
      default: "",
      trim: true,
    },

    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },

    image: {
      type: String,
    },

    isAI: {
      type: Boolean,
      default: false,
      index: true,
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
    premiumActivatedAt: {
      type: Date,
    },
    premiumPlan: {
      type: String,
      enum: ["monthly"],
    },
    premiumPaymentProvider: {
      type: String,
    },
    premiumLastPaymentAt: {
      type: Date,
    },
    premiumLastPaymentIntentId: {
      type: String,
      default: null,
    },
    premiumLastCheckoutSessionId: {
      type: String,
      default: null,
    },
    premiumExpiryReminderSentAt: {
      type: Date,
      default: null,
    },
    premiumExpiryReminderFor: {
      type: Date,
      default: null,
    },
    premiumPaymentMethod: {
      type: Map,
      of: Schema.Types.Mixed,
      default: null,
    },

    uiTheme: {
      type: Object,
      default: null,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
      index: true,
    },

    // 🚨 MODERATION
    accountStatus: {
      type: String,
      enum: ["active", "warned", "restricted", "suspended", "banned"],
      default: "active",
      index: true,
    },
    accountStatusReason: {
      type: String,
      trim: true,
      default: "",
    },
    accountStatusAt: {
      type: Date,
      default: null,
    },

    // ✅ ACCOUNT VERIFICATION
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },

    lastSeen: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

UserSchema.index({ createdAt: -1 });



/* =======================
   5️⃣ Export Model (Next.js Safe)
======================= */

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
