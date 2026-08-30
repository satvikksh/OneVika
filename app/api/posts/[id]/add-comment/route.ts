// app/api/posts/[id]/add-comment/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { Types } from "mongoose";
import Post, { IComment } from "@/app/models/Post"; // Import IComment if needed
import { recordActivity } from "@/app/lib/creator-revenue/service";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await req.json();
    
    if (!content?.trim()) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    await dbConnect();

    // Use updateOne to avoid middleware issues
    const result = await Post.updateOne(
      { _id: params.id },
      {
        $push: {
          comments: {
            user: session.user.id,
            text: content.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Post not found or failed to add comment" }, { status: 404 });
    }

    await recordActivity({
      viewerId: new Types.ObjectId(session.user.id),
      events: [
        {
          eventType: "comment",
          contentId: params.id,
          commentText: content.trim(),
        },
      ],
    });

    // Fetch the updated post with populated data
    const updatedPost = await Post.findById(params.id)
      .populate('comments.user', 'name email image avatar');

    if (!updatedPost) {
      return NextResponse.json({ error: "Post not found after update" }, { status: 404 });
    }

    // Get the newly added comment (last one)
    const newComment = updatedPost.comments[updatedPost.comments.length - 1];
    
    if (!newComment) {
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
    }
    
    // Format the response - use text field, not content
    const response = {
      _id: newComment._id.toString(),
      content: newComment.text, // Use text field for content
      userId: {
        _id: (newComment.user as any)?._id?.toString() || session.user.id,
        name: (newComment.user as any)?.name || 'Unknown User',
        email: (newComment.user as any)?.email || 'unknown@example.com',
        image: (newComment.user as any)?.image || (newComment.user as any)?.avatar,
      },
      createdAt: newComment.createdAt ? newComment.createdAt.toISOString() : new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
    
  } catch (error: any) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add comment. Please try again." },
      { status: 500 }
    );
  }
}