import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { isPremiumActive } from "@/app/lib/premium";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const active = isPremiumActive(user);
    const expiresAt = user.premiumExpiresAt || null;
    const daysRemaining =
      active && expiresAt
        ? Math.max(
            0,
            Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
          )
        : 0;

    if (!active && user.isPremium) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { isPremium: false },
        },
      );
    }

    return NextResponse.json({
      isPremium: active,
      premiumExpiresAt: expiresAt,
      daysRemaining,
      premiumPlan: user.premiumPlan || null,
      paymentMethod: user.premiumPaymentMethod || null,
    });
  } catch (error) {
    console.error("PREMIUM STATUS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch premium status" },
      { status: 500 },
    );
  }
}

