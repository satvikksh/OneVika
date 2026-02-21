import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import User from "@/app/models/User";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token required" },
        { status: 400 }
      );
    }

    await dbConnect();

    await User.findByIdAndUpdate(
      session.user.id,
      { fcmToken: token },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "FCM token saved successfully",
    });

  } catch (error) {
    console.error("Save FCM Token Error:", error);

    return NextResponse.json(
      { error: "Failed to save token" },
      { status: 500 }
    );
  }
}