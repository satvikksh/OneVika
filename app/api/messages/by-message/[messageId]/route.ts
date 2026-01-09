import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import mongoose from "mongoose";

const { Types } = mongoose;

/* =========================
   DELETE MESSAGE (FOR EVERYONE)
========================= */
export async function DELETE(
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

    const conn = await dbConnect();
    const db = conn.connection.db;

    const message = await db?.collection("messages").findOne({
      _id: new Types.ObjectId(messageId),
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // 🔐 Only sender can delete for everyone
    if (message.senderId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await db?.collection("messages").deleteOne({
      _id: new Types.ObjectId(messageId),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
/* =========================
   END DELETE MESSAGE (FOR EVERYONE)
========================= */
