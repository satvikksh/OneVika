import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const currentUserId = new ObjectId(session.user.id);
    const allowedUserIds = new Set<string>();

    // 1) Mutual follows only (A follows B and B follows A, both active)
    const iFollowRows = await db
      .collection("follows")
      .find(
        { followerId: currentUserId, status: "active" },
        { projection: { followingId: 1 } }
      )
      .toArray();

    const followsMeRows = await db
      .collection("follows")
      .find(
        { followingId: currentUserId, status: "active" },
        { projection: { followerId: 1 } }
      )
      .toArray();

    const iFollowSet = new Set(
      iFollowRows.map((row: any) => row.followingId?.toString?.()).filter(Boolean)
    );
    const followsMeSet = new Set(
      followsMeRows.map((row: any) => row.followerId?.toString?.()).filter(Boolean)
    );

    iFollowSet.forEach((id) => {
      if (followsMeSet.has(id) && id !== session.user?.id) {
        allowedUserIds.add(id);
      }
    });

    // 2) Any existing conversation interaction
    const conversations = await db
      .collection("conversations")
      .find({ participants: currentUserId }, { projection: { participants: 1 } })
      .toArray();

    conversations.forEach((conv: any) => {
      (conv.participants || []).forEach((p: any) => {
        const id = p?.toString?.();
        if (id && id !== session.user?.id) {
          allowedUserIds.add(id);
        }
      });
    });

    if (allowedUserIds.size === 0) {
      return NextResponse.json({ users: [] });
    }

    const objectIds = [...allowedUserIds].map((id) => new ObjectId(id));

    const users = await db
      .collection("users")
      .find(
        { _id: { $in: objectIds } },
        {
          projection: {
            name: 1,
            email: 1,
            avatar: 1,
            image: 1,
            lastSeen: 1,
          },
        }
      )
      .sort({ name: 1 })
      .toArray();

    const usersWithStatus = users.map((user: any) => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar || user.image,
      isOnline: false,
      lastSeen: user.lastSeen ? new Date(user.lastSeen).toISOString() : null,
    }));

    return NextResponse.json({ users: usersWithStatus });
  } catch (error) {
    console.error("FETCH CHAT USERS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat users" },
      { status: 500 }
    );
  }
}
