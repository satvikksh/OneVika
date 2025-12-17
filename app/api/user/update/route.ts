import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
  await connectDB();
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // ✅ Username validation
  if (body.name && body.name.length < 3) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters" },
      { status: 400 }
    );
  }

  await User.updateOne(
    { email: session.user.email },
    {
      name: body.name,
      bio: body.bio,
      avatar: body.avatar,
      cover: body.cover,
      isPrivate: body.isPrivate,
    }
  );

  return NextResponse.json({ success: true });
}
