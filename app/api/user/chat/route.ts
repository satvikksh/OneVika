import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { isPremiumActive } from "@/app/lib/premium";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

export async function GET() {
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
    const allowedUserIds = new Set<string>();

    // 1) Mutual follows only (A follows B and B follows A, both active)
    const iFollowRows = await db
      .collection("follows")
      .find(
        { followerId: currentUserId, status: "active" },
        { projection: { followingId: 1 } }
      )
      .toArray();

    const followsMeRows = await db
      .collection("follows")
      .find(
        { followingId: currentUserId, status: "active" },
        { projection: { followerId: 1 } }
      )
      .toArray();

    const iFollowSet = new Set(
      iFollowRows.map((row: any) => row.followingId?.toString?.()).filter(Boolean)
    );
    const followsMeSet = new Set(
      followsMeRows.map((row: any) => row.followerId?.toString?.()).filter(Boolean)
    );

    iFollowSet.forEach((id) => {
      if (followsMeSet.has(id) && id !== session.user?.id) {
        allowedUserIds.add(id);
      }
    });

    // 2) Any existing conversation interaction
    const conversations = await db
      .collection("conversations")
      .find({ participants: currentUserId }, { projection: { participants: 1 } })
      .toArray();

    conversations.forEach((conv: any) => {
      (conv.participants || []).forEach((p: any) => {
        const id = p?.toString?.();
        if (id && id !== session.user?.id) {
          allowedUserIds.add(id);
        }
      });
    });

    if (allowedUserIds.size === 0) {
      return NextResponse.json({ users: [] });
    }

    const objectIds = [...allowedUserIds].map((id) => new ObjectId(id));

    const users = await db
      .collection("users")
      .find(
        { _id: { $in: objectIds } },
        {
          projection: {
            name: 1,
            email: 1,
            avatar: 1,
            image: 1,
            lastSeen: 1,
            isPremium: 1,
            premiumExpiresAt: 1,
          },
        }
      )
      .sort({ name: 1 })
      .toArray();

    const conversationByOtherUserId = new Map<
      string,
      { conversationId: any; otherUserId: string }
    >();

    conversations.forEach((conv: any) => {
      const participants = Array.isArray(conv.participants)
        ? conv.participants
        : [];

      const other = participants.find(
        (p: any) => p?.toString?.() !== session.user?.id
      );
      const otherUserId = other?.toString?.();
      if (!otherUserId) return;

      conversationByOtherUserId.set(otherUserId, {
        conversationId: conv._id,
        otherUserId,
      });
    });

    const conversationIds = Array.from(
      new Set(
        Array.from(conversationByOtherUserId.values()).map((row) =>
          row.conversationId?.toString?.()
        )
      )
    )
      .filter(Boolean)
      .map((id) => new ObjectId(id as string));

    const lastMessageByConversationId = new Map<string, string>();
    const unreadBySenderId = new Map<string, number>();

    if (conversationIds.length > 0) {
      const lastMessages = await db
        .collection("messages")
        .aggregate([
          { $match: { conversationId: { $in: conversationIds } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: "$conversationId",
              lastMessageAt: { $first: "$createdAt" },
            },
          },
        ])
        .toArray();

      lastMessages.forEach((row: any) => {
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
              conversationId: { $in: conversationIds },
              receiverId: currentUserId,
              read: { $ne: true },
            },
          },
          {
            $group: {
              _id: "$senderId",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      unreadCounts.forEach((row: any) => {
        const senderId = row?._id?.toString?.();
        if (!senderId) return;
        unreadBySenderId.set(senderId, Number(row.count) || 0);
      });
    }

    const usersWithStatus = users.map((user: any) => {
      const userId = user._id.toString();
      const conv = conversationByOtherUserId.get(userId);
      const conversationId = conv?.conversationId?.toString?.();

      return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar || user.image,
        isPremium: isPremiumActive(user),
        isOnline: false,
        lastSeen: user.lastSeen ? new Date(user.lastSeen).toISOString() : null,
        unreadCount: unreadBySenderId.get(userId) ?? 0,
        lastMessageAt: conversationId
          ? lastMessageByConversationId.get(conversationId) ?? null
          : null,
      };
    });

    return NextResponse.json({ users: usersWithStatus });
  } catch (error) {
    console.error("FETCH CHAT USERS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat users" },
      { status: 500 }
    );
  }
}
