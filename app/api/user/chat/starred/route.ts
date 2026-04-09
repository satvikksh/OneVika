import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";
import { decryptChatText } from "@/app/lib/chatCrypto";

const { ObjectId } = mongoose.Types;

type StoredAttachment = {
  url?: string;
  type?: "image" | "video" | "audio" | "file";
  fileName?: string;
};

type StoredMessage = {
  _id: mongoose.Types.ObjectId;
  text?: string;
  textCipher?: string;
  textIv?: string;
  textTag?: string;
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId | null;
  conversationId: mongoose.Types.ObjectId;
  createdAt: Date;
  attachments?: StoredAttachment[];
  starredByUserIds?: mongoose.Types.ObjectId[];
  deletedForUserIds?: mongoose.Types.ObjectId[];
};

type ConversationDoc = {
  _id: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  isGroup?: boolean;
  name?: string;
};

type UserPreview = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  avatar?: string;
  image?: string;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getNativeDb();
    const currentUserId = new ObjectId(session.user.id);

    const messages = (await db
      .collection("messages")
      .find({
        starredByUserIds: currentUserId,
        deletedForUserIds: { $ne: currentUserId },
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()) as StoredMessage[];

    if (messages.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    const conversationIds = Array.from(
      new Set(messages.map((message) => message.conversationId.toString()))
    ).map((conversationId) => new ObjectId(conversationId));

    const conversations = await db
      .collection<ConversationDoc>("conversations")
      .find({ _id: { $in: conversationIds } })
      .toArray();

    const conversationById = new Map(
      conversations.map((conversation) => [
        conversation._id.toString(),
        conversation,
      ])
    );

    const userIds = Array.from(
      new Set(
        conversations.flatMap((conversation) =>
          (conversation.participants || [])
            .map((participant) => participant?.toString?.())
            .filter(Boolean)
        )
      )
    ).map((userId) => new ObjectId(userId as string));

    const users = await db
      .collection<UserPreview>("users")
      .find({ _id: { $in: userIds } }, { projection: { name: 1, avatar: 1, image: 1 } })
      .toArray();

    const userById = new Map(
      users.map((user) => [
        user._id.toString(),
        {
          name: user.name || "Unknown user",
          avatar: user.avatar || user.image || "",
        },
      ])
    );

    const starredMessages = messages.map((message) => {
      let text = message.text || "";

      if (!text && message.textCipher && message.textIv && message.textTag) {
        try {
          text = decryptChatText({
            textCipher: message.textCipher,
            textIv: message.textIv,
            textTag: message.textTag,
          });
        } catch (error) {
          console.error("STARRED MESSAGE DECRYPT ERROR:", error);
          text = "[Unable to decrypt message]";
        }
      }

      const conversation = conversationById.get(message.conversationId.toString());
      const participantIds = (conversation?.participants || [])
        .map((participant) => participant?.toString?.())
        .filter(Boolean) as string[];
      const otherParticipantId = participantIds.find((participantId) => participantId !== session.user.id);
      const chatName = conversation?.isGroup
        ? conversation.name?.trim() || "Untitled group"
        : otherParticipantId
          ? userById.get(otherParticipantId)?.name || "Direct chat"
          : "Direct chat";

      return {
        id: message._id.toString(),
        text,
        content: text,
        senderId: message.senderId.toString(),
        receiverId: message.receiverId?.toString?.() ?? "",
        conversationId: message.conversationId.toString(),
        timestamp: message.createdAt,
        attachments: Array.isArray(message.attachments)
          ? message.attachments.map((attachment) => ({
              url: attachment.url,
              type: attachment.type || "file",
              fileName: attachment.fileName,
            }))
          : [],
        isStarred: true,
        chatName,
        chatType: conversation?.isGroup ? "group" : "direct",
      };
    });

    return NextResponse.json({ messages: starredMessages });
  } catch (error) {
    console.error("FETCH STARRED MESSAGES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch starred messages" },
      { status: 500 }
    );
  }
}
