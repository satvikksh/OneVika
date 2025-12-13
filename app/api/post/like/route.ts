import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import User from "../../../models/User";
import Post from "../../../models/Post";
import { connectDB } from "../../../lib/mongodb";

export async function POST(req: Request) {
  const { postId } = await req.json();
  const session = await getServerSession(authOptions);

  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  await connectDB();

  const user = await User.findById(session.user.id);

  const alreadyLiked = user.likedPosts.includes(postId);

  if (alreadyLiked) {
    user.likedPosts.pull(postId);
    await Post.findByIdAndUpdate(postId, { $inc: { likes: -1 } });
  } else {
    user.likedPosts.push(postId);
    await Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } });
  }

  await user.save();

  return new Response("OK", { status: 200 });
}
