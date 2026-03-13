// app/api/posts/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { isPremiumActive } from "@/app/lib/premium";
import Post from "@/app/models/Post";
import mongoose from "mongoose";

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

    // Find the post
    const post = await Post.findById(params.id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Create the comment
    const newComment = {
      user: session.user.id,
      text: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add comment to post
    post.comments.push(newComment as any);
    
    // Save without hooks if there's an issue
    try {
      await post.save();
    } catch (saveError) {
      console.error("Error saving post with comment:", saveError);
      // Try saving without middleware
      await Post.updateOne(
        { _id: params.id },
        { $push: { comments: newComment } }
      );
    }

    // Fetch the updated post with populated data
    const updatedPost = await Post.findById(params.id)
      .populate('userId', 'name email image avatar isPremium premiumExpiresAt')
      .populate('comments.user', 'name email image avatar isPremium premiumExpiresAt');

    if (!updatedPost) {
      return NextResponse.json({ error: "Post not found after update" }, { status: 404 });
    }

    // Get the newly added comment (last one)
    const addedComment = updatedPost.comments[updatedPost.comments.length - 1];
    
    if (!addedComment) {
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
    }
    
    // Format the response
    const response = {
      _id: addedComment._id.toString(),
      content: addedComment.text,
      userId: {
        _id: (addedComment.user as any)?._id?.toString() || session.user.id,
        name: (addedComment.user as any)?.name || 'Unknown User',
        email: (addedComment.user as any)?.email || 'unknown@example.com',
        image: (addedComment.user as any)?.image || (addedComment.user as any)?.avatar,
        avatar: (addedComment.user as any)?.avatar || (addedComment.user as any)?.image,
        isPremium: isPremiumActive((addedComment.user as any) || {}),
      },
      createdAt: addedComment.createdAt ? addedComment.createdAt.toISOString() : new Date().toISOString(),
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

// GET all comments for a post
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    await dbConnect();

    const post = await Post.findById(params.id)
      .populate('userId', 'name email image avatar isPremium premiumExpiresAt')
      .populate('comments.user', 'name email image avatar isPremium premiumExpiresAt');

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Format comments to match frontend expectations
    const formattedComments = post.comments.map((comment: any) => ({
      _id: comment._id.toString(),
      content: comment.text || comment.content,
      userId: {
        _id: (comment.user as any)?._id?.toString() || comment.user?.toString(),
        name: (comment.user as any)?.name || 'Unknown User',
        email: (comment.user as any)?.email || 'unknown@example.com',
        image: (comment.user as any)?.image || (comment.user as any)?.avatar,
        avatar: (comment.user as any)?.avatar || (comment.user as any)?.image,
        isPremium: isPremiumActive((comment.user as any) || {}),
      },
      createdAt: comment.createdAt ? comment.createdAt.toISOString() : new Date().toISOString(),
    }));

    // Sort by newest first
    formattedComments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(formattedComments);
    
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// DELETE a comment from a post
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get commentId from query parameters or request body
    const url = new URL(req.url);
    const commentId = url.searchParams.get('commentId');
    
    if (!commentId) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    await dbConnect();

    // Find the post
    const post = await Post.findById(params.id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Find the comment
    const comment = post.comments.find((c: any) => c._id.toString() === commentId);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Debug: Check user IDs
    console.log("Comment user ID:", comment.user);
    console.log("Session user ID:", session.user.id);
    console.log("Comment user ID type:", typeof comment.user);
    console.log("Session user ID type:", typeof session.user.id);

    // Check if current user is the comment owner
    let commentUserId: string;
    
    // Handle both cases: user could be ObjectId or populated object
    if (comment.user && typeof comment.user === 'object' && '_id' in comment.user) {
      commentUserId = (comment.user as any)._id.toString();
    } else if (comment.user) {
      commentUserId = (comment.user as any).toString();
    } else {
      commentUserId = '';
    }
    
    const sessionUserId = session.user.id.toString();
    
    console.log("Comment userId string:", commentUserId);
    console.log("Session userId string:", sessionUserId);
    
    if (commentUserId !== sessionUserId) {
      return NextResponse.json(
        { 
          error: "You are not authorized to delete this comment",
          details: {
            commentUserId,
            sessionUserId,
            commentId
          }
        }, 
        { status: 403 }
      );
    }

    // Remove the comment using $pull
    const result = await Post.updateOne(
      { _id: params.id },
      { $pull: { comments: { _id: commentId } } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: "Comment deleted successfully"
    });
    
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
}

// Alternative DELETE method using request body (if you prefer)
export async function DELETE_VIA_BODY(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get commentId from request body
    const { commentId } = await req.json();
    
    if (!commentId) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    await dbConnect();

    // Use findOneAndUpdate to both check and update in one operation
    const post = await Post.findOneAndUpdate(
      { 
        _id: params.id,
        "comments._id": commentId,
        "comments.user": session.user.id  // This ensures only comment owner can delete
      },
      { $pull: { comments: { _id: commentId } } },
      { new: true }
    );

    if (!post) {
      return NextResponse.json(
        { 
          error: "Comment not found or you are not authorized to delete it",
          details: {
            postId: params.id,
            commentId,
            userId: session.user.id
          }
        }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Comment deleted successfully"
    });
    
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
}
