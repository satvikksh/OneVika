import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  await connectDB();

  await User.findByIdAndUpdate(session.user.id, {
    name: body.name,
    bio: body.bio,
    avatar: body.avatar || "",
  });

  return new Response("Updated", { status: 200 });
}
