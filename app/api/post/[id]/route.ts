import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import {connectDB} from "../../../lib/mongodb";
import Post from "../../../models/Post";


type Params = {
  id: string;
};

export async function DELETE(
  req: Request,
  { params }: { params: Params }
) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await Post.findById(params.id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Post.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE POST ERROR:", err);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}