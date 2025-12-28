export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { NextResponse } from "next/server";
import User from "@/app/models/User";
import { dbConnect } from "@/app/lib/mongodb";

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
