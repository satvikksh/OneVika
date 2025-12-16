import User from "../../../models/User";
import Post from "../../../models/Post";
import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const posts = await Post.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    const likedPosts = await Post.find({
      _id: { $in: user.likedPosts || [] },
    }).lean();

    return NextResponse.json({
      user,
      posts,
      likedPosts,
    });
  } catch (err) {
    console.error("PROFILE API ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}