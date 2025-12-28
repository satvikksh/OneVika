import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import {dbConnect} from "../../../../lib/mongodb";
import Comment from "../../../../models/Comment";
import Post from "@/app/models/Post";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params; // ✅ required
    const { text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Comment text required" },
        { status: 400 }
      );
    }

    const post = await Post.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            userId: session.user.id,
            text,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate("userId");

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post.comments.at(-1)); // return latest comment
  } catch (err) {
    console.error("COMMENT ERROR:", err);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}