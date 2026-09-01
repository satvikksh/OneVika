import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAdminAuditLog extends Document {
  adminId: Types.ObjectId;
  action: string;
  targetId?: string;
  description: string;
  userId?: Types.ObjectId;
  membershipId?: string;
  transactionId?: string;
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    membershipId: {
      type: String,
      trim: true,
      index: true,
    },
    transactionId: {
      type: String,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    previousStatus: {
      type: String,
      trim: true,
    },
    newStatus: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });

const AdminAuditLog: Model<IAdminAuditLog> =
  mongoose.models.AdminAuditLog ||
  mongoose.model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);

export default AdminAuditLog;
