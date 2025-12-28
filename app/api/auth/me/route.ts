import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import { NextResponse } from "next/server";
import User from "../../../models/User";
import { dbConnect } from "../../../lib/mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ email: session.user.email })
    .select("avatar");

  return NextResponse.json({
    avatar: user?.avatar || "/avatar-default.png",
  });
}
