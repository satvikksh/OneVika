import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {connectDB} from "../../../lib/mongodb";
import Post from "../../../models/Post";


export async function POST(req: Request) {
  try {
    // 1️⃣ Get session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2️⃣ Parse body
    const { content } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { message: "Post content required" },
        { status: 400 }
      );
    }

    // 3️⃣ Connect DB (must await)
    await connectDB();

    // 4️⃣ Create post
    const post = await Post.create({
      author: session.user.id, // ObjectId
      content: content.trim(),
      likes: [],
    });

    // 5️⃣ Return saved post
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("POST CREATE ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
export async function DELETE(req: any, { params }: any) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({}, { status: 401 });

  const post = await Post.findById(params.id);
  if (!post) return NextResponse.json({}, { status: 404 });

  if (post.userId.toString() !== session.user.id)
    return NextResponse.json({}, { status: 403 });

  await post.deleteOne();
  return NextResponse.json({ success: true });
}
