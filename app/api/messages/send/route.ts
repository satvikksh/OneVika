import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
 import { getNativeDb } from "@/app/lib/mongodb";
import mongoose from "mongoose";
const { Types } = mongoose;
const { ObjectId } = Types;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, receiverId } = await req.json();

    if (!text?.trim() || !receiverId) {
      return NextResponse.json(
        { error: "Text and receiverId required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(receiverId) || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json(
        { error: "Invalid sender or receiver id" },
        { status: 400 }
      );
    }

  const db = await getNativeDb();
  
  await db.collection("messages").find({}).toArray();
  
    const senderObjectId = new ObjectId(session.user.id);
    const receiverObjectId = new ObjectId(receiverId);

    let conversation = await db.collection("conversations").findOne({
      participants: { $all: [senderObjectId, receiverObjectId] },
    });

    if (!conversation) {
      const result = await db.collection("conversations").insertOne({
        participants: [senderObjectId, receiverObjectId],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      conversation = { _id: result.insertedId };
    }

    const createdAt = new Date();

    const result = await db.collection("messages").insertOne({
      conversationId: conversation._id,
      text,
      senderId: senderObjectId,
      receiverId: receiverObjectId,
      createdAt,
      read: false,
    });

    return NextResponse.json({
      success: true,
      message: {
        id: result.insertedId.toString(),
        conversationId: conversation._id.toString(),
        text,
        senderId: session.user.id,
        receiverId,
        timestamp: createdAt.toISOString(),
        read: false,
      },
    });
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
