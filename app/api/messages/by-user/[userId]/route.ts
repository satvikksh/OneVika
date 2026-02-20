import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import mongoose from "mongoose";
import { decryptChatText } from "@/app/lib/chatCrypto";

const { ObjectId } = mongoose.Types;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    /* ---------------- AUTH ---------------- */
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* 🔥 FIX: await params */
    const { userId: receiverIdRaw } = await context.params;
    const senderIdRaw = session.user.id;

    if (!receiverIdRaw) {
      return NextResponse.json(
        { error: "User id is required" },
        { status: 400 }
      );
    }

    if (
      !ObjectId.isValid(receiverIdRaw) ||
      !ObjectId.isValid(senderIdRaw)
    ) {
      return NextResponse.json(
        { error: "Invalid MongoDB user id" },
        { status: 400 }
      );
    }

    if (receiverIdRaw === senderIdRaw) {
      return NextResponse.json({ messages: [] });
    }

    /* ---------------- DB ---------------- */
    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const senderId = new ObjectId(senderIdRaw);
    const receiverId = new ObjectId(receiverIdRaw);

    /* ---------------- FIND CONVERSATION ---------------- */
    const conversation = await db.collection("conversations").findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    /* ---------------- FETCH MESSAGES ---------------- */
    const messages = await db
      .collection("messages")
      .find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .toArray();

    /* ---------------- FORMAT RESPONSE ---------------- */
    const formatted = messages.map((m: any) => {
      let text = m.text || "";

      // New encrypted storage path
      if (!text && m.textCipher && m.textIv && m.textTag) {
        try {
          text = decryptChatText({
            textCipher: m.textCipher,
            textIv: m.textIv,
            textTag: m.textTag,
          });
        } catch (e) {
          console.error("MESSAGE DECRYPT ERROR:", e);
          text = "[Unable to decrypt message]";
        }
      }

      return {
        id: m._id.toString(),
        text,
        senderId: m.senderId.toString(),
        receiverId: m.receiverId.toString(),
        conversationId: m.conversationId.toString(),
        timestamp: m.createdAt,
        read: Boolean(m.read),
      };
    });

    return NextResponse.json({ messages: formatted });
  } catch (error) {
    console.error("FETCH MESSAGES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
