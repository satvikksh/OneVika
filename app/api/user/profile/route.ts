import User from "../../../models/User";
import Post from "../../../models/Post";
import { NextResponse } from "next/server";
import { dbConnect } from "../../../lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";



export async function GET() {
await dbConnect();

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await User.findOne({ email: session.user.email }).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const posts = await Post.find({ userId: user._id }).sort({ createdAt: -1 });

  const likedPosts = await Post.find({
    likes: user._id,
  }).sort({ createdAt: -1 });

  return NextResponse.json({
    user,
    posts,
    likedPosts,
  });
}
