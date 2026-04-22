import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";

const { ObjectId } = mongoose.Types;

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getNativeDb();
    const currentUserId = new ObjectId(session.user.id);
    const now = new Date();

    const result = await db.collection("messages").updateMany(
      {
        senderId: { $ne: currentUserId },
        deletedForUserIds: { $ne: currentUserId },
        hiddenForUserIds: { $ne: currentUserId },
        readByUserIds: { $ne: currentUserId },
      },
      {
        $addToSet: {
          deliveredToUserIds: currentUserId,
          readByUserIds: currentUserId,
        },
      }
    );

    const conversations = await db
      .collection("conversations")
      .find(
        { participants: currentUserId },
        { projection: { _id: 1 } }
      )
      .toArray();

    if (conversations.length > 0) {
      await db.collection("chatReadStates").bulkWrite(
        conversations.map((conversation) => ({
          updateOne: {
            filter: {
              ownerId: currentUserId,
              conversationId: conversation._id,
            },
            update: {
              $set: {
                lastSeenAt: now,
                updatedAt: now,
              },
              $setOnInsert: {
                ownerId: currentUserId,
                conversationId: conversation._id,
                createdAt: now,
              },
            },
            upsert: true,
          },
        }))
      );
    }

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount ?? 0,
    });
  } catch (error) {
    console.error("MARK ALL READ ERROR:", error);
    return NextResponse.json(
      { error: "Failed to mark all messages as read" },
      { status: 500 }
    );
  }
}
