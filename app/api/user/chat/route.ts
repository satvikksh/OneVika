import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import {
  ChatPreferenceDoc,
  hasUnlockedChatCookie,
  toChatPreferenceState,
} from "@/app/lib/chatAccess";
import { isPremiumActive } from "@/app/lib/premium";
import { ensureAiConversationForUser } from "@/app/lib/aiAssistant";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

type FollowRow = {
  followerId?: mongoose.Types.ObjectId;
  followingId?: mongoose.Types.ObjectId;
};

type ConversationRow = {
  _id: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  admins?: mongoose.Types.ObjectId[];
  isGroup?: boolean;
  name?: string;
  createdBy?: mongoose.Types.ObjectId;
};

type LastMessageRow = {
  _id?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
};

type UnreadCountRow = {
  _id?: mongoose.Types.ObjectId;
  count?: number;
};

type ChatUserRow = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  avatar?: string;
  image?: string;
  lastSeen?: Date | string | null;
  isPremium?: boolean;
  premiumExpiresAt?: Date | null;
  isAI?: boolean;
};

type BlockRow = {
  blockerId?: mongoose.Types.ObjectId;
  blockedId?: mongoose.Types.ObjectId;
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const currentUserId = new ObjectId(session.user.id);
    await ensureAiConversationForUser(session.user.id);
    const allowedUserIds = new Set<string>();

    // 1) Mutual follows only (A follows B and B follows A, both active)
    const iFollowRows = await db
      .collection<FollowRow>("follows")
      .find(
        { followerId: currentUserId, status: "active" },
        { projection: { followingId: 1 } }
      )
      .toArray();

    const followsMeRows = await db
      .collection<FollowRow>("follows")
      .find(
        { followingId: currentUserId, status: "active" },
        { projection: { followerId: 1 } }
      )
      .toArray();

    const iFollowSet = new Set(
      iFollowRows.map((row) => row.followingId?.toString?.()).filter(Boolean)
    );
    const followsMeSet = new Set(
      followsMeRows.map((row) => row.followerId?.toString?.()).filter(Boolean)
    );

    iFollowSet.forEach((id) => {
      if (followsMeSet.has(id) && id !== session.user?.id) {
        allowedUserIds.add(id);
      }
    });

    // 2) Any existing conversation interaction
    const conversations = await db
      .collection<ConversationRow>("conversations")
      .find(
        { participants: currentUserId },
        {
          projection: {
            participants: 1,
            admins: 1,
            isGroup: 1,
            name: 1,
            createdBy: 1,
          },
        }
      )
      .toArray();

    const directConversations = conversations.filter(
      (conv) => !conv.isGroup
    );
    const groupConversations = conversations.filter((conv) => Boolean(conv.isGroup));

    directConversations.forEach((conv) => {
      (conv.participants || []).forEach((p) => {
        const id = p?.toString?.();
        if (id && id !== session.user?.id) {
          allowedUserIds.add(id);
        }
      });
    });

    if (allowedUserIds.size === 0 && groupConversations.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const groupMemberIds = new Set<string>();
    groupConversations.forEach((conversation) => {
      (conversation.participants || []).forEach((participant) => {
        const participantId = participant?.toString?.();
        if (participantId && participantId !== session.user.id) {
          groupMemberIds.add(participantId);
        }
      });
    });

    const directObjectIds = Array.from(allowedUserIds).map(
      (id) => new ObjectId(id)
    );
    const profileLookupObjectIds = Array.from(
      new Set([...allowedUserIds, ...groupMemberIds])
    ).map((id) => new ObjectId(id));
    const blocks =
      directObjectIds.length > 0
        ? await db
            .collection<BlockRow>("blockedUsers")
            .find({
              $or: [
                {
                  blockerId: currentUserId,
                  blockedId: { $in: directObjectIds },
                },
                {
                  blockerId: { $in: directObjectIds },
                  blockedId: currentUserId,
                },
              ],
            })
            .toArray()
        : [];

    const blockedByCurrentUser = new Set<string>();
    const blockedCurrentUser = new Set<string>();

    blocks.forEach((block) => {
      const blockerId = block.blockerId?.toString?.();
      const blockedId = block.blockedId?.toString?.();
      if (!blockerId || !blockedId) return;

      if (blockerId === session.user.id) {
        blockedByCurrentUser.add(blockedId);
      }

      if (blockedId === session.user.id) {
        blockedCurrentUser.add(blockerId);
      }
    });

    const preferences =
      directObjectIds.length > 0
        ? await db
            .collection<ChatPreferenceDoc>("chatPreferences")
            .find(
              {
                ownerId: currentUserId,
                chatUserId: { $in: directObjectIds },
              },
              {
                projection: {
                  chatUserId: 1,
                  isPinned: 1,
                  isArchived: 1,
                  isLocked: 1,
                  lockVisibility: 1,
                },
              }
            )
            .toArray()
        : [];

    const preferenceByUserId = new Map<string, ChatPreferenceDoc>();
    preferences.forEach((preference) => {
      const key = preference.chatUserId?.toString?.();
      if (key) {
        preferenceByUserId.set(key, preference);
      }
    });

    const referencedUsers =
      profileLookupObjectIds.length > 0
        ? await db
            .collection<ChatUserRow>("users")
            .find(
              { _id: { $in: profileLookupObjectIds } },
              {
                projection: {
                  name: 1,
                  email: 1,
                  avatar: 1,
                  image: 1,
                  lastSeen: 1,
                  isPremium: 1,
                  premiumExpiresAt: 1,
                  isAI: 1,
                },
              }
            )
            .sort({ name: 1 })
            .toArray()
        : [];
    const directUsers = referencedUsers.filter((user) =>
      allowedUserIds.has(user._id.toString())
    );

    const conversationByOtherUserId = new Map<
      string,
      { conversationId: mongoose.Types.ObjectId; otherUserId: string }
    >();

    directConversations.forEach((conv) => {
      const participants = Array.isArray(conv.participants)
        ? conv.participants
        : [];

      const other = participants.find(
        (p) => p?.toString?.() !== session.user?.id
      );
      const otherUserId = other?.toString?.();
      if (!otherUserId) return;

      conversationByOtherUserId.set(otherUserId, {
        conversationId: conv._id,
        otherUserId,
      });
    });

    const allConversationIds = Array.from(
      new Set(
        [
          ...Array.from(conversationByOtherUserId.values()).map((row) =>
            row.conversationId?.toString?.()
          ),
          ...groupConversations.map((conversation) =>
            conversation._id?.toString?.()
          ),
        ]
      )
    )
      .filter(Boolean)
      .map((id) => new ObjectId(id as string));

    const lastMessageByConversationId = new Map<string, string>();
    const unreadByConversationId = new Map<string, number>();

    if (allConversationIds.length > 0) {
      const lastMessages = await db
        .collection("messages")
        .aggregate([
          { $match: { conversationId: { $in: allConversationIds } } },
          { $match: { deletedForUserIds: { $ne: currentUserId } } },
          { $match: { hiddenForUserIds: { $ne: currentUserId } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: "$conversationId",
              lastMessageAt: { $first: "$createdAt" },
            },
          },
        ])
        .toArray() as LastMessageRow[];

      lastMessages.forEach((row) => {
        const key = row?._id?.toString?.();
        if (!key || !row.lastMessageAt) return;
        lastMessageByConversationId.set(
          key,
          new Date(row.lastMessageAt).toISOString()
        );
      });

      const unreadCounts = await db
        .collection("messages")
        .aggregate([
          {
            $match: {
              conversationId: { $in: allConversationIds },
              senderId: { $ne: currentUserId },
              deletedForUserIds: { $ne: currentUserId },
              hiddenForUserIds: { $ne: currentUserId },
            },
          },
          {
            $lookup: {
              from: "chatReadStates",
              let: { currentConversationId: "$conversationId" },
              pipeline: [
                {
                  $match: {
                    ownerId: currentUserId,
                  },
                },
                {
                  $match: {
                    $expr: {
                      $eq: ["$conversationId", "$$currentConversationId"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    lastSeenAt: 1,
                  },
                },
              ],
              as: "readState",
            },
          },
          {
            $addFields: {
              lastSeenAt: {
                $ifNull: [
                  { $arrayElemAt: ["$readState.lastSeenAt", 0] },
                  new Date(0),
                ],
              },
            },
          },
          {
            $match: {
              $expr: {
                $gt: ["$createdAt", "$lastSeenAt"],
              },
            },
          },
          {
            $group: {
              _id: "$conversationId",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray() as UnreadCountRow[];

      unreadCounts.forEach((row) => {
        const conversationId = row?._id?.toString?.();
        if (!conversationId) return;
        unreadByConversationId.set(conversationId, Number(row.count) || 0);
      });
    }

    const usersWithStatus = directUsers.map((user) => {
      const userId = user._id.toString();
      const conv = conversationByOtherUserId.get(userId);
      const conversationId = conv?.conversationId?.toString?.();
      const preference = preferenceByUserId.get(userId);
      const isUnlocked = preference?.isLocked
        ? hasUnlockedChatCookie(req, session.user.id, userId)
        : false;
      const chatPreference = toChatPreferenceState(preference, isUnlocked);
      const isBlockedByCurrentUser = blockedByCurrentUser.has(userId);
      const hasBlockedCurrentUser = blockedCurrentUser.has(userId);

      return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar || user.image,
        isAI: Boolean(user.isAI),
        isPremium: isPremiumActive(user),
        isOnline: Boolean(user.isAI),
        lastSeen: user.lastSeen ? new Date(user.lastSeen).toISOString() : null,
        unreadCount: conversationId
          ? unreadByConversationId.get(conversationId) ?? 0
          : 0,
        lastMessageAt: conversationId
          ? lastMessageByConversationId.get(conversationId) ?? null
          : null,
        isPinned: chatPreference.isPinned,
        isArchived: chatPreference.isArchived,
        isLocked: chatPreference.isLocked,
        lockVisibility: chatPreference.lockVisibility,
        isUnlocked: chatPreference.isUnlocked,
        isBlocked: isBlockedByCurrentUser || hasBlockedCurrentUser,
        isBlockedByCurrentUser,
        hasBlockedCurrentUser,
        canMessage: !(isBlockedByCurrentUser || hasBlockedCurrentUser),
        chatType: "direct",
        conversationId: conversationId ?? null,
        subtitle: user.isAI ? "AI assistant" : null,
      };
    });

    const userById = new Map(
      referencedUsers.map((user) => [
        user._id.toString(),
        {
          name: user.name,
          avatar: user.avatar || user.image,
        },
      ])
    );

    const groupChats = groupConversations.map((conversation) => {
      const conversationId = conversation._id.toString();
      const memberIds = (conversation.participants || [])
        .map((participant) => participant?.toString?.())
        .filter(Boolean) as string[];
      const otherMemberIds = memberIds.filter((memberId) => memberId !== session.user.id);
      const previewNames = otherMemberIds
        .map((memberId) => userById.get(memberId)?.name)
        .filter(Boolean)
        .slice(0, 3);
      const adminIds = (
        conversation.admins?.length
          ? conversation.admins
          : conversation.createdBy
            ? [conversation.createdBy]
            : []
      )
        .map((adminId) => adminId?.toString?.())
        .filter(Boolean) as string[];

      return {
        _id: conversationId,
        name:
          conversation.name?.trim() ||
          previewNames.join(", ") ||
          "Untitled group",
        email: null,
        avatar: null,
        isPremium: false,
        isOnline: false,
        lastSeen: null,
        unreadCount: unreadByConversationId.get(conversationId) ?? 0,
        lastMessageAt: lastMessageByConversationId.get(conversationId) ?? null,
        isPinned: false,
        isArchived: false,
        isLocked: false,
        lockVisibility: "blur",
        isUnlocked: true,
        isBlocked: false,
        isBlockedByCurrentUser: false,
        hasBlockedCurrentUser: false,
        canMessage: true,
        chatType: "group",
        conversationId,
        memberIds,
        memberCount: memberIds.length,
        adminIds,
        isGroupOwner:
          conversation.createdBy?.toString?.() === session.user.id,
        isGroupAdmin: adminIds.includes(session.user.id),
        subtitle: `${memberIds.length} members`,
      };
    });

    return NextResponse.json({ users: [...groupChats, ...usersWithStatus] });
  } catch (error) {
    console.error("FETCH CHAT USERS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat users" },
      { status: 500 }
    );
  }
}
