// app/api/posts/[id]/like/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { isPremiumActive } from "@/app/lib/premium";
import Post from "@/app/models/Post";
import User from "@/app/models/User";
import { Types } from "mongoose";
import { recordActivity } from "@/app/lib/creator-revenue/service";
import { rejectIfInactive } from "@/app/lib/user-status";

function getObjectId(value: unknown) {
  if (value instanceof Types.ObjectId) return value;
  if (
    value &&
    typeof value === "object" &&
    "_id" in value &&
    value._id instanceof Types.ObjectId
  ) {
    return value._id;
  }
  return new Types.ObjectId(String(value));
}

// Handle GET request to get users who liked the post
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Find the post
    const post = await Post.findById(id);
    
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // If no likes, return empty array
    if (!post.likes || post.likes.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch user details for each like
    const users = await User.find(
      { _id: { $in: post.likes } },
      { _id: 1, name: 1, email: 1, image: 1, avatar: 1, isPremium: 1, premiumExpiresAt: 1 }
    );

    // Format users for response
    const formattedUsers = users.map(user => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      avatar: user.avatar,
      isPremium: isPremiumActive(user),
    }));

    return NextResponse.json(formattedUsers);
    
  } catch (error) {
    console.error("Error fetching like users:", error);
    return NextResponse.json(
      { error: "Failed to fetch like users" },
      { status: 500 }
    );
  }
}

// Handle POST request to toggle like
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inactiveReason = await rejectIfInactive(session.user.id);
    if (inactiveReason) {
      return NextResponse.json({ error: inactiveReason }, { status: 403 });
    }

    await dbConnect();

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const post = await Post.findById(id).select("_id userId likes");
    
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const userId = new Types.ObjectId(session.user.id);
    const contentId = new Types.ObjectId(id);
    const creatorId = getObjectId(post.userId);
    const alreadyLiked = post.likes.some(
      (likeId: Types.ObjectId) => likeId.toString() === userId.toString()
    );

    if (alreadyLiked) {
      await Post.updateOne({ _id: contentId }, { $pull: { likes: userId } });
    } else {
      const updateResult = await Post.updateOne(
        { _id: contentId, likes: { $ne: userId } },
        { $addToSet: { likes: userId } }
      );

      if (updateResult.modifiedCount === 1) {
        await recordActivity({
          viewerId: userId,
          events: [
            {
              eventType: "like",
              contentId: id,
              creatorId: creatorId.toString(),
            },
          ],
        });
      }
    }

    const updatedPost = await Post.findById(id).select("likes").lean();
    const likes = (updatedPost?.likes || []).map((likeId) => likeId.toString());

    return NextResponse.json({
      success: true,
      likes,
      liked: !alreadyLiked
    });
    
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    );
  }
}
