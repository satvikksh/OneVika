import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";

const { ObjectId } = mongoose.Types;

type CreateGroupRequestBody = {
  name?: string;
  memberIds?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as CreateGroupRequestBody | null;
    const name = body?.name?.trim() ?? "";
    const memberIds = Array.isArray(body?.memberIds) ? body.memberIds : [];

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Group name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    const uniqueMemberIds = Array.from(
      new Set(
        memberIds
          .map((memberId) => memberId?.trim())
          .filter(
            (memberId): memberId is string =>
              Boolean(memberId) &&
              memberId !== session.user.id &&
              ObjectId.isValid(memberId)
          )
      )
    );

    if (uniqueMemberIds.length < 2) {
      return NextResponse.json(
        { error: "Select at least 2 people to create a group" },
        { status: 400 }
      );
    }

    const db = await getNativeDb();
    const currentUserId = new ObjectId(session.user.id);
    const participantIds = [currentUserId, ...uniqueMemberIds.map((id) => new ObjectId(id))];

    const existingUsers = await db
      .collection("users")
      .find({ _id: { $in: participantIds } }, { projection: { _id: 1 } })
      .toArray();

    if (existingUsers.length !== participantIds.length) {
      return NextResponse.json(
        { error: "One or more selected members could not be found" },
        { status: 400 }
      );
    }

    const now = new Date();
    const result = await db.collection("conversations").insertOne({
      participants: participantIds,
      admins: [currentUserId],
      isGroup: true,
      name,
      createdBy: currentUserId,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      chat: {
        _id: result.insertedId.toString(),
        name,
        avatar: "",
        isPremium: false,
        isOnline: false,
        lastSeen: null,
        unreadCount: 0,
        lastMessageAt: null,
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
        conversationId: result.insertedId.toString(),
        memberIds: participantIds.map((participantId) => participantId.toString()),
        memberCount: participantIds.length,
        adminIds: [currentUserId.toString()],
        isGroupOwner: true,
        isGroupAdmin: true,
        subtitle: `${participantIds.length} members`,
      },
    });
  } catch (error) {
    console.error("CREATE GROUP ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
