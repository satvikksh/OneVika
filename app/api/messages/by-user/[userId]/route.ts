import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect, getNativeDb } from "@/app/lib/mongodb";
import mongoose from "mongoose";
import { decryptChatText } from "@/app/lib/chatCrypto";
import {
  ChatPreferenceDoc,
  clearChatUnlockCookie,
  hasUnlockedChatCookie,
  normalizeLockVisibility,
  setChatUnlockCookie,
  toChatPreferenceState,
} from "@/app/lib/chatAccess";

const { ObjectId } = mongoose.Types;

type StoredAttachment = {
  url?: string;
  type?: "image" | "video" | "audio" | "file";
  mimeType?: string;
  fileName?: string;
  size?: number;
  targetUrl?: string;
  source?: "feed" | "upload" | "link";
};

type StoredMessage = {
  _id: mongoose.Types.ObjectId;
  text?: string;
  textCipher?: string;
  textIv?: string;
  textTag?: string;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  createdAt: Date;
  read?: boolean;
  type?: "text" | "image" | "video" | "audio" | "file";
  attachments?: StoredAttachment[];
  replyToId?: mongoose.Types.ObjectId | string;
  deletedForUserIds?: mongoose.Types.ObjectId[];
};

type PreferenceRequestBody = {
  isPinned?: boolean;
  isArchived?: boolean;
  lock?: {
    enabled?: boolean;
    password?: string;
    visibility?: "blur" | "hidden";
  };
};

type UnlockRequestBody = {
  password?: string;
};

type DeleteChatRequestBody = {
  scope?: "messages" | "conversation";
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: receiverIdRaw } = await context.params;
    const senderIdRaw = session.user.id;

    if (!receiverIdRaw) {
      return NextResponse.json(
        { error: "User id is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(receiverIdRaw) || !ObjectId.isValid(senderIdRaw)) {
      return NextResponse.json(
        { error: "Invalid MongoDB user id" },
        { status: 400 }
      );
    }

    if (receiverIdRaw === senderIdRaw) {
      return NextResponse.json({ messages: [] });
    }

    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const senderId = new ObjectId(senderIdRaw);
    const receiverId = new ObjectId(receiverIdRaw);

    const preference = await db.collection<ChatPreferenceDoc>("chatPreferences").findOne(
      { ownerId: senderId, chatUserId: receiverId },
      {
        projection: {
          isLocked: 1,
        },
      }
    );

    if (
      preference?.isLocked &&
      !hasUnlockedChatCookie(req, senderIdRaw, receiverIdRaw)
    ) {
      return NextResponse.json(
        {
          error: "This chat is locked",
          requiresPassword: true,
        },
        { status: 423 }
      );
    }

    const conversation = await db.collection("conversations").findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    const messages = await db
      .collection("messages")
      .find({
        conversationId: conversation._id,
        deletedForUserIds: { $ne: senderId },
      })
      .sort({ createdAt: 1 })
      .toArray();

    const formatted = messages.map((m) => {
      const message = m as StoredMessage;
      let text = message.text || "";

      if (!text && message.textCipher && message.textIv && message.textTag) {
        try {
          text = decryptChatText({
            textCipher: message.textCipher,
            textIv: message.textIv,
            textTag: message.textTag,
          });
        } catch (error) {
          console.error("MESSAGE DECRYPT ERROR:", error);
          text = "[Unable to decrypt message]";
        }
      }

      return {
        id: message._id.toString(),
        text,
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
        conversationId: message.conversationId.toString(),
        timestamp: message.createdAt,
        read: Boolean(message.read),
        type:
          message.type ||
          (Array.isArray(message.attachments) && message.attachments[0]?.type) ||
          "text",
        attachments: Array.isArray(message.attachments)
          ? message.attachments.map((attachment) => ({
              url: attachment.url,
              type: attachment.type || "file",
              mimeType: attachment.mimeType,
              fileName: attachment.fileName,
              size: attachment.size,
              targetUrl: attachment.targetUrl,
              source: attachment.source,
            }))
          : [],
        replyToId: message.replyToId?.toString?.() || undefined,
      };
    });

    return NextResponse.json({ messages: formatted });
  } catch (error) {
    console.error("FETCH MESSAGES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await context.params;
    if (!ObjectId.isValid(session.user.id) || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as PreferenceRequestBody | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const hasPinUpdate = typeof body.isPinned === "boolean";
    const hasArchiveUpdate = typeof body.isArchived === "boolean";
    const hasLockUpdate = typeof body.lock?.enabled === "boolean";

    if (!hasPinUpdate && !hasArchiveUpdate && !hasLockUpdate) {
      return NextResponse.json({ error: "No preference changes provided" }, { status: 400 });
    }

    const ownerId = new ObjectId(session.user.id);
    const chatUserId = new ObjectId(userId);
    const db = await getNativeDb();
    const collection = db.collection<ChatPreferenceDoc>("chatPreferences");
    const existing = await collection.findOne({ ownerId, chatUserId });

    const nextPreference = {
      isPinned: hasPinUpdate ? Boolean(body.isPinned) : Boolean(existing?.isPinned),
      isArchived: hasArchiveUpdate ? Boolean(body.isArchived) : Boolean(existing?.isArchived),
      isLocked: hasLockUpdate
        ? Boolean(body.lock?.enabled)
        : Boolean(existing?.isLocked),
      lockVisibility: hasLockUpdate
        ? normalizeLockVisibility(body.lock?.visibility)
        : normalizeLockVisibility(existing?.lockVisibility),
    };

    let nextPasswordHash = existing?.lockPasswordHash;

    if (hasLockUpdate && body.lock?.enabled) {
      const nextPassword = body.lock.password?.trim() ?? "";
      if (nextPassword.length < 4) {
        return NextResponse.json(
          { error: "Password must be at least 4 characters long" },
          { status: 400 }
        );
      }

      nextPasswordHash = await bcrypt.hash(nextPassword, 10);
    }

    if (hasLockUpdate && body.lock?.enabled === false) {
      if (!existing?.isLocked || !existing.lockPasswordHash) {
        return NextResponse.json(
          { error: "Chat is not currently locked" },
          { status: 400 }
        );
      }

      const currentPassword = body.lock.password?.trim() ?? "";
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Password confirmation is required to remove the lock" },
          { status: 400 }
        );
      }

      const passwordMatches = await bcrypt.compare(
        currentPassword,
        existing.lockPasswordHash
      );

      if (!passwordMatches) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 403 }
        );
      }

      nextPasswordHash = undefined;
      nextPreference.lockVisibility = "blur";
    }

    const isDefaultState =
      !nextPreference.isPinned &&
      !nextPreference.isArchived &&
      !nextPreference.isLocked;

    if (isDefaultState) {
      await collection.deleteOne({ ownerId, chatUserId });

      const response = NextResponse.json({
        preference: toChatPreferenceState(null, false),
      });
      clearChatUnlockCookie(response, userId);
      return response;
    }

    const now = new Date();
    const updateDoc: Record<string, unknown> = {
      $set: {
        ownerId,
        chatUserId,
        isPinned: nextPreference.isPinned,
        isArchived: nextPreference.isArchived,
        isLocked: nextPreference.isLocked,
        lockVisibility: nextPreference.lockVisibility,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    };

    if (nextPreference.isLocked && nextPasswordHash) {
      (updateDoc.$set as Record<string, unknown>).lockPasswordHash = nextPasswordHash;
    } else {
      updateDoc.$unset = { lockPasswordHash: "" };
    }

    const result = await collection.findOneAndUpdate(
      { ownerId, chatUserId },
      updateDoc,
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    const response = NextResponse.json({
      preference: toChatPreferenceState(result, false),
    });

    if (hasLockUpdate) {
      clearChatUnlockCookie(response, userId);
    }

    return response;
  } catch (error) {
    console.error("UPDATE CHAT PREFERENCES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update chat preferences" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await context.params;
    if (!ObjectId.isValid(session.user.id) || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as UnlockRequestBody | null;
    const password = body?.password?.trim() ?? "";
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const ownerId = new ObjectId(session.user.id);
    const chatUserId = new ObjectId(userId);
    const db = await getNativeDb();
    const collection = db.collection<ChatPreferenceDoc>("chatPreferences");
    const preference = await collection.findOne({ ownerId, chatUserId });

    if (!preference?.isLocked || !preference.lockPasswordHash) {
      return NextResponse.json({ error: "Chat is not locked" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, preference.lockPasswordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }

    const response = NextResponse.json({
      success: true,
      preference: toChatPreferenceState(preference, true),
    });
    setChatUnlockCookie(response, session.user.id, userId);

    return response;
  } catch (error) {
    console.error("UNLOCK CHAT ERROR:", error);
    return NextResponse.json(
      { error: "Failed to unlock chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await context.params;
    if (!ObjectId.isValid(session.user.id) || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as DeleteChatRequestBody;
    const scope = body.scope === "messages" ? "messages" : "conversation";

    const currentUserObjectId = new ObjectId(session.user.id);
    const otherUserObjectId = new ObjectId(userId);
    const db = await getNativeDb();

    const conversation = await db.collection("conversations").findOne({
      participants: {
        $all: [currentUserObjectId, otherUserObjectId],
        $size: 2,
      },
    });

    if (!conversation?._id) {
      return NextResponse.json({
        success: true,
        scope,
        deletedMessages: 0,
        deletedConversation: 0,
      });
    }

    const messagesDeleteResult = await db.collection("messages").deleteMany({
      conversationId: conversation._id,
    });

    let deletedConversationCount = 0;
    if (scope === "conversation") {
      const [conversationDeleteResult] = await Promise.all([
        db.collection("conversations").deleteOne({ _id: conversation._id }),
        db.collection<ChatPreferenceDoc>("chatPreferences").deleteOne({
          ownerId: currentUserObjectId,
          chatUserId: otherUserObjectId,
        }),
      ]);

      deletedConversationCount = conversationDeleteResult.deletedCount ?? 0;
    } else {
      await db.collection("conversations").updateOne(
        { _id: conversation._id },
        { $set: { updatedAt: new Date() } }
      );
    }

    const response = NextResponse.json({
      success: true,
      scope,
      deletedMessages: messagesDeleteResult.deletedCount ?? 0,
      deletedConversation: deletedConversationCount,
    });

    if (scope === "conversation") {
      clearChatUnlockCookie(response, userId);
    }

    return response;
  } catch (error) {
    console.error("DELETE CHAT ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 }
    );
  }
}
