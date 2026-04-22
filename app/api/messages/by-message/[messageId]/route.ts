import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import mongoose from "mongoose";

const { Types } = mongoose;

type StoredMessage = {
  _id: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId | null;
  conversationId?: mongoose.Types.ObjectId;
  deletedForUserIds?: mongoose.Types.ObjectId[];
  hiddenForUserIds?: mongoose.Types.ObjectId[];
};

type ConversationDoc = {
  _id: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
};

type UpdateMessageBody = {
  hidden?: boolean;
};

const isCurrentUserParticipant = async ({
  db,
  message,
  sessionUserId,
}: {
  db: mongoose.mongo.Db | undefined;
  message: StoredMessage;
  sessionUserId: string;
}) => {
  const isDirectParticipant =
    message.senderId.toString() === sessionUserId ||
    message.receiverId?.toString?.() === sessionUserId;

  if (isDirectParticipant) {
    return true;
  }

  if (!message.conversationId) {
    return false;
  }

  const conversation = await db
    ?.collection<ConversationDoc>("conversations")
    .findOne(
      { _id: message.conversationId },
      { projection: { participants: 1 } }
    );

  return Boolean(
    conversation?.participants?.some(
      (participant) => participant.toString() === sessionUserId
    )
  );
};

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await context.params;
    const scope = req.nextUrl.searchParams.get("scope") ?? "everyone";

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { error: "Invalid message id" },
        { status: 400 }
      );
    }

    const conn = await dbConnect();
    const db = conn.connection.db;
    const currentUserId = new Types.ObjectId(session.user.id);
    const messageObjectId = new Types.ObjectId(messageId);

    const message = await db?.collection<StoredMessage>("messages").findOne({
      _id: messageObjectId,
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    const isParticipant = await isCurrentUserParticipant({
      db,
      message,
      sessionUserId: session.user.id,
    });

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (scope === "self") {
      await db?.collection<StoredMessage>("messages").updateOne(
        { _id: messageObjectId },
        {
          $addToSet: {
            deletedForUserIds: currentUserId,
          },
        }
      );

      return NextResponse.json({
        success: true,
        scope: "self",
      });
    }

    if (message.senderId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Only the sender can delete for everyone" },
        { status: 403 }
      );
    }

    await db?.collection("messages").deleteOne({
      _id: messageObjectId,
    });

    return NextResponse.json({
      success: true,
      scope: "everyone",
    });
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { error: "Invalid message id" },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => null)) as UpdateMessageBody | null;
    if (!body || typeof body.hidden !== "boolean") {
      return NextResponse.json(
        { error: "A boolean hidden value is required" },
        { status: 400 }
      );
    }

    const conn = await dbConnect();
    const db = conn.connection.db;
    const currentUserId = new Types.ObjectId(session.user.id);
    const messageObjectId = new Types.ObjectId(messageId);

    const message = await db?.collection<StoredMessage>("messages").findOne({
      _id: messageObjectId,
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    const isDeletedForCurrentUser = Boolean(
      message.deletedForUserIds?.some(
        (deletedUserId) => deletedUserId.toString() === session.user.id
      )
    );

    if (isDeletedForCurrentUser) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    const isParticipant = await isCurrentUserParticipant({
      db,
      message,
      sessionUserId: session.user.id,
    });

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await db?.collection<StoredMessage>("messages").updateOne(
      { _id: messageObjectId },
      body.hidden
        ? {
            $addToSet: {
              hiddenForUserIds: currentUserId,
            },
          }
        : {
            $pull: {
              hiddenForUserIds: currentUserId,
            },
          }
    );

    return NextResponse.json({
      success: true,
      messageId,
      isHidden: body.hidden,
    });
  } catch (error) {
    console.error("UPDATE MESSAGE VISIBILITY ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update message visibility" },
      { status: 500 }
    );
  }
}
