import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";

const { ObjectId } = mongoose.Types;

type StoredMessage = {
  _id: mongoose.Types.ObjectId;
  deletedForUserIds?: mongoose.Types.ObjectId[];
  starredByUserIds?: mongoose.Types.ObjectId[];
};

export async function POST(
  _req: Request,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await context.params;

    if (!ObjectId.isValid(messageId)) {
      return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
    }

    const db = await getNativeDb();
    const currentUserId = new ObjectId(session.user.id);
    const messageObjectId = new ObjectId(messageId);

    await db.collection<StoredMessage>("messages").updateOne(
      {
        _id: messageObjectId,
        deletedForUserIds: { $ne: currentUserId },
      },
      {
        $addToSet: {
          starredByUserIds: currentUserId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      messageId,
      isStarred: true,
    });
  } catch (error) {
    console.error("STAR MESSAGE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to star message" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await context.params;

    if (!ObjectId.isValid(messageId)) {
      return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
    }

    const db = await getNativeDb();
    const currentUserId = new ObjectId(session.user.id);

    await db.collection<StoredMessage>("messages").updateOne(
      { _id: new ObjectId(messageId) },
      {
        $pull: {
          starredByUserIds: currentUserId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      messageId,
      isStarred: false,
    });
  } catch (error) {
    console.error("UNSTAR MESSAGE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to unstar message" },
      { status: 500 }
    );
  }
}
