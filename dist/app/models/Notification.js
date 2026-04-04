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
    isRead: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
const Notification = mongoose.models.Notification ||
    mongoose.model("Notification", notificationSchema);
export default Notification;
