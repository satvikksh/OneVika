import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";

const { ObjectId } = mongoose.Types;

type ConversationDoc = {
  _id: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  admins?: mongoose.Types.ObjectId[];
  isGroup?: boolean;
  name?: string;
  createdBy?: mongoose.Types.ObjectId;
};

type UserPreview = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  avatar?: string;
  image?: string;
};

type AddMembersRequestBody = {
  memberIds?: string[];
};

const getAdminIds = (conversation: ConversationDoc) =>
  (
    conversation.admins?.length
      ? conversation.admins
      : conversation.createdBy
        ? [conversation.createdBy]
        : []
  )
    .map((adminId) => adminId?.toString?.())
    .filter(Boolean) as string[];

async function loadConversation(
  groupId: string,
  currentUserId: string
) {
  const db = await getNativeDb();
  const conversation = await db
    .collection<ConversationDoc>("conversations")
    .findOne({
      _id: new ObjectId(groupId),
      isGroup: true,
      participants: new ObjectId(currentUserId),
    });

  return { db, conversation };
}

async function buildGroupResponse(
  db: Awaited<ReturnType<typeof getNativeDb>>,
  conversation: ConversationDoc,
  currentUserId: string
) {
  const participantIds = (conversation.participants || [])
    .map((participant) => participant?.toString?.())
    .filter(Boolean) as string[];
  const adminIds = getAdminIds(conversation);

  const memberObjectIds = participantIds.map((memberId) => new ObjectId(memberId));
  const users = await db
    .collection<UserPreview>("users")
    .find(
      { _id: { $in: memberObjectIds } },
      { projection: { name: 1, avatar: 1, image: 1 } }
    )
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

  const members = participantIds.map((memberId) => ({
    id: memberId,
    name: userById.get(memberId)?.name || "Unknown user",
    avatar: userById.get(memberId)?.avatar || "",
    role: adminIds.includes(memberId) ? "admin" : "member",
    isYou: memberId === currentUserId,
  }));

  return {
    group: {
      id: conversation._id.toString(),
      conversationId: conversation._id.toString(),
      name: conversation.name?.trim() || "Untitled group",
      memberIds: participantIds,
      memberCount: participantIds.length,
      adminIds,
      createdBy: conversation.createdBy?.toString?.() ?? null,
      isGroupOwner: conversation.createdBy?.toString?.() === currentUserId,
      isGroupAdmin: adminIds.includes(currentUserId),
      subtitle: `${participantIds.length} members`,
    },
    members,
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await context.params;
    if (!ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
    }

    const { db, conversation } = await loadConversation(groupId, session.user.id);

    if (!conversation) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(await buildGroupResponse(db, conversation, session.user.id));
  } catch (error) {
    console.error("FETCH GROUP INFO ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch group info" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await context.params;
    if (!ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
    }

    const { db, conversation } = await loadConversation(groupId, session.user.id);

    if (!conversation) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const adminIds = getAdminIds(conversation);
    if (!adminIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: "Only group admins can add members" },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => null)) as AddMembersRequestBody | null;
    const existingParticipantIds = new Set(
      (conversation.participants || [])
        .map((participant) => participant?.toString?.())
        .filter(Boolean)
    );

    const memberIds = Array.from(
      new Set(
        (body?.memberIds || [])
          .map((memberId) => memberId?.trim())
          .filter(
            (memberId): memberId is string =>
              Boolean(memberId) &&
              ObjectId.isValid(memberId) &&
              !existingParticipantIds.has(memberId)
          )
      )
    );

    if (memberIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one new member to add" },
        { status: 400 }
      );
    }

    const memberObjectIds = memberIds.map((memberId) => new ObjectId(memberId));
    const existingUsers = await db
      .collection("users")
      .find({ _id: { $in: memberObjectIds } }, { projection: { _id: 1 } })
      .toArray();

    if (existingUsers.length !== memberObjectIds.length) {
      return NextResponse.json(
        { error: "One or more selected members could not be found" },
        { status: 400 }
      );
    }

    await db.collection("conversations").updateOne(
      { _id: conversation._id },
      {
        $addToSet: {
          participants: { $each: memberObjectIds },
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    const updatedConversation = await db
      .collection<ConversationDoc>("conversations")
      .findOne({ _id: conversation._id });

    if (!updatedConversation) {
      return NextResponse.json(
        { error: "Group not found after update" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      await buildGroupResponse(db, updatedConversation, session.user.id)
    );
  } catch (error) {
    console.error("ADD GROUP MEMBER ERROR:", error);
    return NextResponse.json(
      { error: "Failed to add group members" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await context.params;
    if (!ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
    }

    const { db, conversation } = await loadConversation(groupId, session.user.id);

    if (!conversation) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const currentUserId = session.user.id;
    const remainingParticipantIds = (conversation.participants || [])
      .map((participant) => participant?.toString?.())
      .filter(
        (participantId): participantId is string =>
          Boolean(participantId) && participantId !== currentUserId
      );
    const remainingAdminIds = getAdminIds(conversation).filter(
      (adminId) => adminId !== currentUserId && remainingParticipantIds.includes(adminId)
    );
    const nextAdminIds =
      remainingAdminIds.length > 0
        ? remainingAdminIds
        : remainingParticipantIds.length > 0
          ? [remainingParticipantIds[0]]
          : [];

    if (remainingParticipantIds.length === 0) {
      await db.collection("conversations").deleteOne({ _id: conversation._id });
      await db.collection("messages").deleteMany({
        conversationId: conversation._id,
      });
    } else {
      await db.collection("conversations").updateOne(
        { _id: conversation._id },
        {
          $set: {
            participants: remainingParticipantIds.map(
              (participantId) => new ObjectId(participantId)
            ),
            admins: nextAdminIds.map((adminId) => new ObjectId(adminId)),
            createdBy: nextAdminIds[0]
              ? new ObjectId(nextAdminIds[0])
              : conversation.createdBy,
            updatedAt: new Date(),
          },
        }
      );

      await db.collection("messages").updateMany(
        { conversationId: conversation._id },
        {
          $addToSet: {
            deletedForUserIds: new ObjectId(currentUserId),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      removedConversation: remainingParticipantIds.length === 0,
    });
  } catch (error) {
    console.error("EXIT GROUP ERROR:", error);
    return NextResponse.json(
      { error: "Failed to exit group" },
      { status: 500 }
    );
  }
}
