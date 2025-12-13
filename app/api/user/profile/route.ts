import User from "../../../models/User";
import Post from "../../../models/Post"; // if you have posts
import { connectDB } from "../../../lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  await connectDB();

  const user = await User.findById(session.user.id).lean();
  const posts = await Post.find({ userId: session.user.id }).lean();
  const likedPosts = await Post.find({ _id: { $in: user.likedPosts } });

  return new Response(
    JSON.stringify({ user, posts, likedPosts }),
    { status: 200 }
  );
}
