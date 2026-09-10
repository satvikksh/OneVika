import mongoose, { Schema, Model, Document } from "mongoose";

/* =======================
   📌 Saved Repository Interface
======================= */
export interface ISavedRepository extends Document {
  userId: mongoose.Types.ObjectId;
  githubRepositoryId: string;
  name: string;
  fullName: string;
  ownerLogin: string;
  ownerAvatar: string;
  description: string;
  htmlUrl: string;
  language: string;
  stars: number;
  forks: number;
  topics: string[];
  savedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* =======================
   📌 Saved Repository Schema
======================= */
const SavedRepositorySchema = new Schema<ISavedRepository>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    githubRepositoryId: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerLogin: {
      type: String,
      required: true,
      trim: true,
    },

    ownerAvatar: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    htmlUrl: {
      type: String,
      required: true,
      trim: true,
    },

    language: {
      type: String,
      default: "",
      trim: true,
    },

    stars: {
      type: Number,
      default: 0,
      min: 0,
    },

    forks: {
      type: Number,
      default: 0,
      min: 0,
    },

    topics: {
      type: [String],
      default: [],
    },

    savedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

/* =======================
   🔒 Unique index: one (user, repo) save max
======================= */
SavedRepositorySchema.index(
  { userId: 1, githubRepositoryId: 1 },
  { unique: true }
);

SavedRepositorySchema.index({ savedAt: -1 });

/* =======================
   5️⃣ Export Model (Next.js Safe)
======================= */
const SavedRepository: Model<ISavedRepository> =
  mongoose.models.SavedRepository ||
  mongoose.model<ISavedRepository>("SavedRepository", SavedRepositorySchema);

export default SavedRepository;