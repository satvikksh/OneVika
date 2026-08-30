import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type ProjectStatus =
  | "planning"
  | "in-progress"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "active"
  | "research"
  | "paused";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "in-progress",
  "on-hold",
  "completed",
  "cancelled",
  "active",
  "research",
  "paused",
];

export interface IProject extends Document {
  userId: Types.ObjectId;
  title: string;
  tagline: string;
  category: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  techStack: string[];
  highlights: string[];
  githubUrl?: string;
  liveUrl?: string;
  duration?: string;
  teamSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    tagline: {
      type: String,
      trim: true,
      default: "",
      maxlength: 160,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
      maxlength: 80,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "planning",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    techStack: {
      type: [String],
      default: [],
    },
    highlights: {
      type: [String],
      default: [],
    },
    githubUrl: {
      type: String,
      trim: true,
      default: "",
    },
    liveUrl: {
      type: String,
      trim: true,
      default: "",
    },
    duration: {
      type: String,
      trim: true,
      default: "",
      maxlength: 60,
    },
    teamSize: {
      type: Number,
      min: 1,
      max: 1000,
      default: 1,
    },
  },
  { timestamps: true }
);

ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ createdAt: -1 });

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
