import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import mongoose from "mongoose";

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
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
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

    // Check if target user exists
    const targetUser = await db.collection("users").findOne({
      _id: targetUserObjectId
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already following
    const existingFollow = await db.collection("follows").findOne({
      followerId: currentUserObjectId,
      followingId: targetUserObjectId
    });

    if (existingFollow) {
      // Update status if previously unfollowed
      await db.collection("follows").updateOne(
        { _id: existingFollow._id },
        { 
          $set: { 
            status: "active",
            updatedAt: new Date()
          } 
        }
      );
    } else {
      // Create new follow record
      await db.collection("follows").insertOne({
        followerId: currentUserObjectId,
        followingId: targetUserObjectId,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Get updated counts
    const followersCount = await db.collection("follows").countDocuments({
      followingId: targetUserObjectId,
      status: "active"
    });

    const followingCount = await db.collection("follows").countDocuments({
      followerId: currentUserObjectId,
      status: "active"
    });

    return NextResponse.json({
      success: true,
      message: "Followed successfully",
      isFollowing: true,
      followersCount,
      followingCount
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

    return NextResponse.json({
      success: true,
      message: "Unfollowed successfully",
      isFollowing: false,
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