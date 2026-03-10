import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import mongoose from "mongoose";
import Notification from "@/app/models/Notification";
import { emitRealtimeNotification } from "@/app/lib/socketServerEmitter";


const { ObjectId } = mongoose.Types;
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: targetUserId } = await context.params;
    const currentUserId = session.user.id;

    if (!ObjectId.isValid(targetUserId) || !ObjectId.isValid(currentUserId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) throw new Error("MongoDB not connected");

    const targetUserObjectId = new ObjectId(targetUserId);
    const currentUserObjectId = new ObjectId(currentUserId);

    const targetUser = await db.collection("users").findOne({
      _id: targetUserObjectId,
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingFollow = await db.collection("follows").findOne({
      followerId: currentUserObjectId,
      followingId: targetUserObjectId,
    });

    if (existingFollow) {
      await db.collection("follows").updateOne(
        { _id: existingFollow._id },
        {
          $set: {
            status: "active",
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await db.collection("follows").insertOne({
        followerId: currentUserObjectId,
        followingId: targetUserObjectId,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // ✅ Save notification in DB only
    const notification = await Notification.create({
      userId: targetUserObjectId,
      senderId: currentUserObjectId,
      type: "follow",
      message: `${session.user.name} started following you`,
      isRead: false,
    });

    await emitRealtimeNotification(targetUserId, {
      _id: notification._id.toString(),
      title: "New Follower",
      message: notification.message,
      senderId: currentUserId,
      url: `/profile/${currentUserId}`,
      createdAt: notification.createdAt,
      type: "follow",
      isRead: false,
    });

    const followersCount = await db.collection("follows").countDocuments({
      followingId: targetUserObjectId,
      status: "active",
    });

    const followingCount = await db.collection("follows").countDocuments({
      followerId: currentUserObjectId,
      status: "active",
    });

    const followsYou = await db.collection("follows").findOne({
      followerId: targetUserObjectId,
      followingId: currentUserObjectId,
      status: "active",
    });

    const isMutualFollow = !!followsYou;

    return NextResponse.json({
      success: true,
      message: "Followed successfully",
      isFollowing: true,
      followsYou: !!followsYou,
      isMutualFollow,
      canMessage: isMutualFollow,
      followersCount,
      followingCount,
      notification, // return notification for frontend emit
    });
  } catch (error) {
    console.error("FOLLOW ERROR:", error);
    return NextResponse.json(
      { error: "Failed to follow user" },
      { status: 500 }
    );
  }
}



export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: targetUserId } = await context.params;
    const currentUserId = session.user.id;

    if (!ObjectId.isValid(targetUserId) || !ObjectId.isValid(currentUserId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const targetUserObjectId = new ObjectId(targetUserId);
    const currentUserObjectId = new ObjectId(currentUserId);

    // Soft delete by updating status
    const result = await db.collection("follows").updateOne(
      {
        followerId: currentUserObjectId,
        followingId: targetUserObjectId
      },
      { 
        $set: { 
          status: "inactive",
          updatedAt: new Date()
        } 
      }
    );

    // Get updated counts
    const followersCount = await db.collection("follows").countDocuments({
      followingId: targetUserObjectId,
      status: "active"
    });

    const followingCount = await db.collection("follows").countDocuments({
      followerId: currentUserObjectId,
      status: "active"
    });

    const followsYou = await db.collection("follows").findOne({
      followerId: targetUserObjectId,
      followingId: currentUserObjectId,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      message: "Unfollowed successfully",
      isFollowing: false,
      followsYou: !!followsYou,
      isMutualFollow: false,
      canMessage: false,
      followersCount,
      followingCount
    });

  } catch (error) {
    console.error("UNFOLLOW ERROR:", error);
    return NextResponse.json(
      { error: "Failed to unfollow user" },
      { status: 500 }
    );
  }
  

}
