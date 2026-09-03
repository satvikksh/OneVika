// app/api/posts/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import Post from "@/app/models/Post";

export async function PATCH(
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

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Post content is required" },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim().slice(0, 5000);

    await dbConnect();

    const post = await Post.findById(params.id).select("userId").lean();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let postUserId: string;
    if (post.userId && typeof post.userId === "object" && "_id" in post.userId) {
      postUserId = (post.userId as any)._id.toString();
    } else if (post.userId) {
      postUserId = String(post.userId);
    } else {
      return NextResponse.json({ error: "Post has no owner" }, { status: 400 });
    }

    if (postUserId !== session.user.id) {
      return NextResponse.json(
        { error: "You are not authorized to edit this post" },
        { status: 403 }
      );
    }

    await Post.updateOne(
      { _id: params.id },
      { $set: { content: trimmedContent, updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: "Post updated successfully",
      content: trimmedContent,
    });
  } catch (error: any) {
    console.error("Error editing post:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

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

    await dbConnect();

    // Add .lean() to get a plain JavaScript object and avoid Mongoose document overhead
    // Use select to only get userId field for efficiency
    const post = await Post.findById(params.id).select('userId').lean();
    
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Debug: Check user IDs
    console.log("Post userId:", post.userId);
    console.log("Session userId:", session.user.id);
    console.log("Post userId type:", typeof post.userId);
    console.log("Session userId type:", typeof session.user.id);
    
    // Handle both cases: userId could be ObjectId or populated object
    let postUserId: string;
    
    // Check if userId is an object with _id property (populated)
    if (post.userId && typeof post.userId === 'object' && '_id' in post.userId) {
      postUserId = (post.userId as any)._id.toString();
    } else if (post.userId) {
      // If it's already an ObjectId or string
      postUserId = String(post.userId);
    } else {
      return NextResponse.json({ error: "Post has no owner" }, { status: 400 });
    }
    
    const sessionUserId = session.user.id.toString();
    
    console.log("Post userId string:", postUserId);
    console.log("Session userId string:", sessionUserId);
    console.log("Comparing:", postUserId, "===", sessionUserId);
    
    // Check if current user is the post owner
    if (postUserId !== sessionUserId) {
      return NextResponse.json(
        { 
          error: "You are not authorized to delete this post",
          details: {
            postUserId,
            sessionUserId,
            postId: params.id
          }
        }, 
        { status: 403 }
      );
    }

    // Delete the post
    await Post.deleteOne({ _id: params.id });

    return NextResponse.json({ 
      success: true,
      message: "Post deleted successfully"
    });
    
  } catch (error: any) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}