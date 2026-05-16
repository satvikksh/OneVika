import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import User from "@/app/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Fetch users except current user
    const users = await User.find(
      { email: { $ne: session.user.email }, isAI: { $ne: true } },
      { password: 0 } // exclude password
    )
      .lean(); // IMPORTANT

    const usersWithStatus = users.map((user: any) => ({
      _id: user._id.toString(),
      name: user.name,
    //   email: user.email,
      avatar: user.avatar || user.image,
      isOnline: false, // later replace with socket / redis
      lastSeen: user.lastSeen
        ? new Date(user.lastSeen).toISOString()
        : null,
    }));

    return NextResponse.json({ users: usersWithStatus });
  } catch (error) {
    console.error("FETCH USERS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
