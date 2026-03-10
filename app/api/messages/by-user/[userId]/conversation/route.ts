import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

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
    const currentUserId = session.user.id;

    if (!ObjectId.isValid(currentUserId) || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const currentUserObjectId = new ObjectId(currentUserId);
    const otherUserObjectId = new ObjectId(userId);

    const db = await getNativeDb();

    const conversation = await db.collection("conversations").findOne({
      participants: { $all: [currentUserObjectId, otherUserObjectId], $size: 2 },
    });

    if (!conversation?._id) {
      return NextResponse.json({
        success: true,
        deletedMessages: 0,
        deletedConversation: 0,
      });
    }

    const [messagesDeleteResult, conversationDeleteResult] = await Promise.all([
      db.collection("messages").deleteMany({ conversationId: conversation._id }),
      db.collection("conversations").deleteOne({ _id: conversation._id }),
    ]);

    return NextResponse.json({
      success: true,
      deletedMessages: messagesDeleteResult.deletedCount ?? 0,
      deletedConversation: conversationDeleteResult.deletedCount ?? 0,
    });
  } catch (error) {
    console.error("DELETE CONVERSATION ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}

