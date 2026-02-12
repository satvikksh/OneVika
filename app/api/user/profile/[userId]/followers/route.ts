import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

export async function GET(
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

    if (!ObjectId.isValid(userId)) {
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

    const targetUserObjectId = new ObjectId(userId);
    const currentUserObjectId = new ObjectId(currentUserId);

    // Get followers with user details
    const followers = await db.collection("follows")
      .aggregate([
        {
          $match: {
            followingId: targetUserObjectId,
            status: "active"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "followerId",
            foreignField: "_id",
            as: "user"
          }
        },
        {
          $unwind: "$user"
        },
        {
          $lookup: {
            from: "follows",
            let: { followerId: "$followerId", currentUserId: currentUserObjectId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$followerId", "$$currentUserId"] },
                      { $eq: ["$followingId", "$$followerId"] },
                      { $eq: ["$status", "active"] }
                    ]
                  }
                }
              }
            ],
            as: "isFollowing"
          }
        },
        {
          $project: {
            id: "$user._id",
            name: "$user.name",
            avatar: "$user.avatar",
            isFollowing: { $gt: [{ $size: "$isFollowing" }, 0] }
          }
        }
      ])
      .toArray();

    // Format results
    const formattedFollowers = followers.map(follower => ({
      id: follower.id.toString(),
      name: follower.name,
      avatar: follower.avatar,
      isFollowing: follower.isFollowing
    }));

    return NextResponse.json({
      followers: formattedFollowers,
      count: formattedFollowers.length
    });

  } catch (error) {
    console.error("FETCH FOLLOWERS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch followers" },
      { status: 500 }
    );
  }
}