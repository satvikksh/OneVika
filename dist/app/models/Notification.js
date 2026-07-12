import mongoose from "mongoose";
const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    type: {
        type: String,
        enum: ["like", "comment", "follow", "message", "story", "thought", "call", "premium"],
        required: true,
    },
    title: {
        type: String,
        default: null,
    },
    message: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        default: null,
    },
    callId: {
        type: String,
        default: null,
        index: true,
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    callType: {
        type: String,
        enum: ["audio", "video", null],
        default: null,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
notificationSchema.index({ userId: 1, callId: 1, type: 1 }, {
    unique: true,
    sparse: true,
    partialFilterExpression: { type: "call", callId: { $exists: true } },
});
const Notification = mongoose.models.Notification ||
    mongoose.model("Notification", notificationSchema);
export default Notification;
