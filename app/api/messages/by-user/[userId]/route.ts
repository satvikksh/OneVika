import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect, getNativeDb } from "@/app/lib/mongodb";
import mongoose from "mongoose";
import { decryptChatText } from "@/app/lib/chatCrypto";
import User from "@/app/models/User";
import {
  ChatPreferenceDoc,
  clearChatUnlockCookie,
  hasUnlockedChatCookie,
  normalizeLockVisibility,
  setChatUnlockCookie,
  toChatPreferenceState,
} from "@/app/lib/chatAccess";
import {
  isSecurityKey,
  normalizeSecurityAnswer,
  SecurityKey,
} from "@/app/lib/securityQuestions";

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
    currentPassword?: string;
    visibility?: "blur" | "hidden";
    recovery?: {
      securityQuestion?: SecurityKey;
      securityAnswer?: string;
    };
  };
};

type UnlockRequestBody = {
  password?: string;
};

type DeleteChatRequestBody = {
  scope?: "messages" | "conversation";
};

type MessagePageInfo = {
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
  oldestMessageId: string | null;
  newestMessageId: string | null;
};

const DEFAULT_MESSAGE_PAGE_SIZE = 40;
const MAX_MESSAGE_PAGE_SIZE = 100;

const parsePageSize = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MESSAGE_PAGE_SIZE;
  }

  return Math.min(parsed, MAX_MESSAGE_PAGE_SIZE);
};

const emptyPageInfo = (): MessagePageInfo => ({
  hasMoreBefore: false,
  hasMoreAfter: false,
  oldestMessageId: null,
  newestMessageId: null,
});

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
      return NextResponse.json({ messages: [], pageInfo: emptyPageInfo() });
    }

    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const senderId = new ObjectId(senderIdRaw);
    const receiverId = new ObjectId(receiverIdRaw);
    const searchParams = req.nextUrl.searchParams;
    const limit = parsePageSize(searchParams.get("limit"));
    const beforeIdRaw = searchParams.get("beforeId");
    const afterIdRaw = searchParams.get("afterId");

    if (beforeIdRaw && !ObjectId.isValid(beforeIdRaw)) {
      return NextResponse.json(
        { error: "Invalid beforeId cursor" },
        { status: 400 }
      );
    }

    if (afterIdRaw && !ObjectId.isValid(afterIdRaw)) {
      return NextResponse.json(
        { error: "Invalid afterId cursor" },
        { status: 400 }
      );
    }

    if (beforeIdRaw && afterIdRaw) {
      return NextResponse.json(
        { error: "Use either beforeId or afterId, not both" },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ messages: [], pageInfo: emptyPageInfo() });
    }

    const cursorFilter: Record<string, unknown> = {
      conversationId: conversation._id,
      deletedForUserIds: { $ne: senderId },
    };

    if (beforeIdRaw) {
      cursorFilter._id = { $lt: new ObjectId(beforeIdRaw) };
    } else if (afterIdRaw) {
      cursorFilter._id = { $gt: new ObjectId(afterIdRaw) };
    }

    const sortDirection = afterIdRaw ? 1 : -1;
    const rawMessages = await db
      .collection("messages")
      .find(cursorFilter)
      .sort({ _id: sortDirection })
      .limit(limit + 1)
      .toArray();

    const hasMore =
      rawMessages.length > limit;
    const messages = hasMore
      ? rawMessages.slice(0, limit)
      : rawMessages;

    if (sortDirection === -1) {
      messages.reverse();
    }

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

    const pageInfo: MessagePageInfo = {
      hasMoreBefore: beforeIdRaw ? hasMore : sortDirection === -1 ? hasMore : false,
      hasMoreAfter: afterIdRaw ? hasMore : false,
      oldestMessageId: formatted[0]?.id ?? null,
      newestMessageId: formatted[formatted.length - 1]?.id ?? null,
    };

    return NextResponse.json({ messages: formatted, pageInfo });
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

      if (existing?.isLocked && existing.lockPasswordHash) {
        const recoveryQuestion = body.lock.recovery?.securityQuestion;
        const recoveryAnswer = body.lock.recovery?.securityAnswer?.trim() ?? "";

        if (recoveryQuestion || recoveryAnswer) {
          if (!recoveryQuestion || !recoveryAnswer) {
            return NextResponse.json(
              { error: "Security question and answer are required for recovery" },
              { status: 400 }
            );
          }

          if (!isSecurityKey(String(recoveryQuestion))) {
            return NextResponse.json(
              { error: "Invalid security question" },
              { status: 400 }
            );
          }

          await dbConnect();
          const owner = await User.findById(session.user.id)
            .select("favoritePet favoriteColor nickname")
            .lean<{
              favoritePet?: string;
              favoriteColor?: string;
              nickname?: string;
            } | null>();

          if (!owner) {
            return NextResponse.json(
              { error: "Unable to verify this account right now" },
              { status: 404 }
            );
          }

          const hasRecoverySetup = ["favoritePet", "favoriteColor", "nickname"].some(
            (key) => String(owner[key as SecurityKey] || "").trim() !== ""
          );

          if (!hasRecoverySetup) {
            return NextResponse.json(
              { error: "Password recovery is not set up for this account" },
              { status: 400 }
            );
          }

          const storedAnswer = normalizeSecurityAnswer(
            String(owner[recoveryQuestion] || "")
          );
          const submittedAnswer = normalizeSecurityAnswer(recoveryAnswer);

          if (!storedAnswer || storedAnswer !== submittedAnswer) {
            return NextResponse.json(
              { error: "Security answer does not match" },
              { status: 403 }
            );
          }
        } else {
          const currentPassword = body.lock.currentPassword?.trim() ?? "";
          if (!currentPassword) {
            return NextResponse.json(
              { error: "Current password is required to update the chat lock" },
              { status: 400 }
            );
          }

          const passwordMatches = await bcrypt.compare(
            currentPassword,
            existing.lockPasswordHash
          );

          if (!passwordMatches) {
            return NextResponse.json(
              { error: "Current password is incorrect" },
              { status: 403 }
            );
          }
        }
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
