import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/authOptions";
import { createRazorpayOrder, getRazorpayPublicKey } from "@/app/lib/razorpay";
import { dbConnect } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { isPremiumActive } from "@/app/lib/premium";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const renewingActivePremium = isPremiumActive(user);

    const amountPaise = Number(process.env.PREMIUM_PRICE_CENTS || "4900");
    const currency = (process.env.PREMIUM_CURRENCY || "inr").toLowerCase();
    const receiptUser = session.user.id.slice(-8);
    const receiptTime = Date.now().toString(36);
    const order = await createRazorpayOrder({
      amountPaise,
      currency,
      userId: session.user.id,
      receipt: `prm_${receiptUser}_${receiptTime}`,
    });

    user.premiumLastCheckoutSessionId = order.id;
    await user.save();

    return NextResponse.json({
      provider: "razorpay",
      keyId: getRazorpayPublicKey(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "OrbitByte",
      description:
        process.env.PREMIUM_PRODUCT_NAME ||
        (renewingActivePremium
          ? "OrbitByte Premium Renewal"
          : "OrbitByte Premium Membership"),
      prefill: {
        name: session.user.name || "",
        email: session.user.email || "",
      },
    });
  } catch (error) {
    console.error("CREATE PREMIUM CHECKOUT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start checkout" },
      { status: 500 },
    );
  }
}
