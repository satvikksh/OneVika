import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  viewers: mongoose.Types.ObjectId[];
  viewerDetails: {
    viewerId: mongoose.Types.ObjectId;
    viewerName: string;
    viewerUsername: string;
    viewerProfilePicture?: string;
    viewedAt: Date;
  }[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    userId: {
  type: Schema.Types.ObjectId,
  ref: "User",
  required: true,
},
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    viewers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    viewerDetails: [
      {
        viewerId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        viewerName: {
          type: String,
          required: true,
          default: "Unknown",
        },
        viewerUsername: {
          type: String,
          required: true,
          default: "unknown",
        },
        viewerProfilePicture: {
          type: String,
          default: "",
        },
        viewedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>('Story', StorySchema);

export default Story;
