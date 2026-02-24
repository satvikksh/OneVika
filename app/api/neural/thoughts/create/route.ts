import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "../../../../lib/mongodb";
import Thought from "../../../../models/Thought";
import Notification from "../../../../models/Notification";
import mongoose from "mongoose";
import { emitRealtimeNotification } from "../../../../lib/socketServerEmitter";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await dbConnect();

  const thought = await Thought.create({
    ...body,
    createdBy: session.user.id,
  });

  const db = mongoose.connection.db;
  if (db) {
    const followerRows = await db.collection("follows")
      .find({
        followingId: new mongoose.Types.ObjectId(session.user.id),
        status: "active",
      })
      .project({ followerId: 1 })
      .toArray();

    const followers = followerRows
      .map((row: any) => row.followerId?.toString?.())
      .filter(Boolean) as string[];

    if (followers.length > 0) {
      const createdAt = new Date();
      const message = `${session.user.name ?? "Someone"} shared a new thought`;

      const notifications = followers.map((followerId) => ({
        userId: new mongoose.Types.ObjectId(followerId),
        senderId: new mongoose.Types.ObjectId(session.user.id),
        type: "thought" as const,
        message,
        isRead: false,
        createdAt,
        updatedAt: createdAt,
      }));

      await Notification.insertMany(notifications, { ordered: false });

      await Promise.all(
        followers.map((followerId) =>
          emitRealtimeNotification(followerId, {
            title: "New Thought",
            message,
            senderId: session.user.id,
            url: "/neural-nexus",
            createdAt,
            type: "thought",
            isRead: false,
          })
        )
      );
    }
  }

  return NextResponse.json(thought);
}
