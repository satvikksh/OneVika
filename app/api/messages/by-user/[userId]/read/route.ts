import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { ChatPreferenceDoc, hasUnlockedChatCookie } from "@/app/lib/chatAccess";
import mongoose from "mongoose";

const { Types } = mongoose;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    /* ---------------- AUTH ---------------- */
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId: receiverId } = await context.params;
    const senderId = session.user.id;

    /* ---------------- VALIDATION ---------------- */
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(receiverId)
    ) {
      return NextResponse.json(
        { error: "Invalid user id" },
        { status: 400 }
      );
    }

    if (senderId === receiverId) {
      return NextResponse.json({ success: true });
    }

    /* ---------------- DB ---------------- */
    const conn = await dbConnect();
    const db = conn.connection.db;

    const senderObjId = new Types.ObjectId(senderId);
    const receiverObjId = new Types.ObjectId(receiverId);

    const preference = await db?.collection<ChatPreferenceDoc>("chatPreferences").findOne(
      { ownerId: senderObjId, chatUserId: receiverObjId },
      {
        projection: {
          isLocked: 1,
        },
      }
    );

    if (
      preference?.isLocked &&
      !hasUnlockedChatCookie(req, senderId, receiverId)
    ) {
      return NextResponse.json(
        { error: "This chat is locked", requiresPassword: true },
        { status: 423 }
      );
    }

    /* ---------------- FIND CONVERSATION ---------------- */
    const conversation = await db?.collection("conversations").findOne({
      participants: { $all: [senderObjId, receiverObjId] },
    });

    if (!conversation) {
      return NextResponse.json({ success: true });
    }

    /* ---------------- MARK AS READ ---------------- */
    await db?.collection("messages").updateMany(
      {
        conversationId: conversation._id,
        senderId: receiverObjId,
        read: { $ne: true },
      },
      { $set: { read: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MARK READ ERROR:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}
