import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type CallTypeValue = "audio" | "video";

export type CallStatusValue =
  | "ringing"
  | "ongoing"
  | "completed"
  | "missed"
  | "rejected"
  | "cancelled"
  | "busy";

export interface ICall extends Document {
  roomName: string;
  callType: CallTypeValue;
  isGroup: boolean;
  callerId: Types.ObjectId;
  receiverId?: Types.ObjectId | null;
  participantIds: Types.ObjectId[];
  conversationId?: Types.ObjectId | null;
  status: CallStatusValue;
  startedAt: Date;
  answeredAt?: Date | null;
  endedAt?: Date | null;
  durationSeconds: number;
  systemMessageId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>(
  {
    roomName: { type: String, required: true, unique: true, index: true },
    callType: { type: String, enum: ["audio", "video"], required: true },
    isGroup: { type: Boolean, default: false },
    callerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    participantIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "ringing",
        "ongoing",
        "completed",
        "missed",
        "rejected",
        "cancelled",
        "busy",
      ],
      default: "ringing",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 },
    systemMessageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true }
);

const Call: Model<ICall> =
  mongoose.models.Call || mongoose.model<ICall>("Call", CallSchema);

export default Call;
