import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import User from "../../../models/User";
import { dbConnect } from "../../../lib/mongodb";
import { authOptions } from "@/app/lib/authOptions";
import { applyPremiumToUser } from "@/app/lib/premium";
import {
  fetchRazorpayPayment,
  verifyRazorpayPaymentSignature,
} from "@/app/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const razorpayOrderId = body?.razorpayOrderId as string | undefined;
    const razorpayPaymentId = body?.razorpayPaymentId as string | undefined;
    const razorpaySignature = body?.razorpaySignature as string | undefined;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        {
          error:
            "razorpayOrderId, razorpayPaymentId and razorpaySignature are required",
        },
        { status: 400 },
      );
    }
    const signatureOk = verifyRazorpayPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!signatureOk) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    let paymentMethod: {
      type?: string;
      brand?: string;
      last4?: string;
      expMonth?: number;
      expYear?: number;
      vpa?: string;
    } | null = null;

    const payment = await fetchRazorpayPayment(razorpayPaymentId);
    const card = payment.card;
    if (payment.method) {
      paymentMethod = {
        type: payment.method,
        brand: card?.network,
        last4: card?.last4,
        expMonth: card?.expiry_month,
        expYear: card?.expiry_year,
        vpa: payment.vpa,
      };
    }

    await dbConnect();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (
      user.premiumLastCheckoutSessionId &&
      user.premiumLastCheckoutSessionId !== razorpayOrderId
    ) {
      return NextResponse.json({ error: "Order mismatch" }, { status: 403 });
    }

    await applyPremiumToUser(user, {
      provider: "razorpay",
      paymentIntentId: razorpayPaymentId,
      checkoutSessionId: razorpayOrderId,
      paymentMethod,
    });

    await user.save();

    return NextResponse.json({ success: true, premiumExpiresAt: user.premiumExpiresAt });

  } catch (error) {
    console.error("Premium Activation Error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
