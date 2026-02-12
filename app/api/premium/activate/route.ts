import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import User from "../../../models/User";
import {dbConnect} from "../../../lib/mongodb";
import { generateAITheme } from "../../../lib/theme-generator";

export async function POST() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({
      email: session.user.email,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate AI theme
    const theme = await generateAITheme();

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    user.isPremium = true;
    user.premiumExpiresAt = expiry;
    user.uiTheme = theme;

    await user.save();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Premium Activation Error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
