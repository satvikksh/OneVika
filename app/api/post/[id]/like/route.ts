import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import Post from "../../../../models/Post";
import { connectDB } from "../../../../lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({}, { status: 401 });

  await connectDB();

  const post = await Post.findById(params.id);
  if (!post) return NextResponse.json({}, { status: 404 });

  const userId = session.user.id;
  const liked = post.likes.includes(userId);

  if (liked) {
    post.likes.pull(userId);
  } else {
    post.likes.push(userId);
  }

  await post.save();

  return NextResponse.json({ liked: !liked, likes: post.likes.length });
}
