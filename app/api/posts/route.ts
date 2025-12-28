export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "../../lib/authOptions";
import { dbConnect } from "../../lib/mongodb";
import Post from "../../models/Post";

/* =========================
   GET — PUBLIC FEED
========================= */
export async function GET() {
  try {
    await dbConnect();

    const posts = await Post.find()
      .populate({
        path: "userId",
        select: "name email avatar",
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(posts);
  } catch (err) {
    console.error("❌ GET POSTS ERROR:", err);
    return NextResponse.json([], { status: 500 });
  }
}

/* =========================
   POST — LOGIN REQUIRED
========================= */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const content = body.content?.trim() || "";
    const images: string[] = body.images || [];

    if (!content && images.length === 0) {
      return NextResponse.json(
        { error: "Post cannot be empty" },
        { status: 400 }
      );
    }

    await dbConnect();

    const post = await Post.create({
      userId: session.user.id,
      content,
      images, // ✅ array (image/video URLs)
    });

    const populatedPost = await post.populate({
      path: "userId",
      select: "name email avatar",
    });

    return NextResponse.json(populatedPost, { status: 201 });
  } catch (err) {
    console.error("❌ POST ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
