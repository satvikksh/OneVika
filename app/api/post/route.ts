import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {connectDB} from "../../lib/mongodb";
import Post from "../../models/Post";


/* =========================
   GET — PUBLIC FEED
========================= */
export async function GET() {
  try {
    await connectDB();

    const posts = await Post.find()
      .populate({
        path: "userId",
        select: "name email avatar",
      })
      .sort({ createdAt: -1 });

    return NextResponse.json(posts, { status: 200 });
  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    return NextResponse.json([], { status: 500 });
  }
}

/* =========================
   POST — LOGIN REQUIRED
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Login required" },
        { status: 401 }
      );
    }

    const { content, image } = await req.json();

    const post = await Post.create({
      content,
      image,
      userId: session.user.id,
    });

    const populatedPost = await post.populate({
      path: "userId",
      select: "name email avatar",
    });

    return NextResponse.json(populatedPost, { status: 201 });
  } catch (err) {
    console.error("POST ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}