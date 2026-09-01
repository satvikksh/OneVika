import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import Order from "@/app/models/Order";
import User from "@/app/models/User";
import { verifyAndCompletePremiumPayment } from "@/app/services/premium-payment";
import { sendPaymentEmail } from "@/app/lib/payment-email";

export const runtime = "nodejs";

/**
 * Premium activation.
 *
 * Premium is NEVER activated based on the client returning from checkout, a
 * "success" redirect, or an unverified status. This handler always verifies the
 * payment server-side with Cashfree and only activates once Cashfree confirms
 * PAID for the exact expected amount.
 *
 * If the payment has not been verified, activation is rejected and premium
 * stays INACTIVE.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const transactionId = body?.transactionId;

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
    }

    await dbConnect();
    const userId = session.user.id;

    const result = await verifyAndCompletePremiumPayment({ transactionId, userId });

    if (!result.ok) {
      if (result.code === "NOT_VERIFIED") {
        return NextResponse.json(
          { success: false, error: result.reason, code: result.code },
          { status: 402 }
        );
      }
      const status =
        result.code === "TX_NOT_FOUND" || result.code === "ORDER_NOT_FOUND"
          ? 404
          : result.code === "ACCESS_DENIED"
            ? 403
            : 400;
      return NextResponse.json(
        { success: false, error: result.reason, code: result.code },
        { status }
      );
    }

    const transaction = await PaymentTransaction.findOne({
      transactionId,
      userId: userId,
    }).lean();
    const order = transaction?.orderId
      ? await Order.findById(transaction.orderId).lean()
      : null;
    const user = await User.findById(userId).lean();

    // Send confirmation email (fire-and-forget; email failure must not roll
    // back the already-persisted DB changes).
    if (!result.alreadyProcessed) {
      sendPaymentEmail({
        email: session.user.email,
        name: user?.name || session.user.name || undefined,
        type: "purchase_confirmation",
        amountPaise: transaction?.amountPaise || 0,
        transactionId,
        orderId: order?.orderId,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      premiumExpiresAt: result.premiumExpiresAt?.toISOString?.() || result.premiumExpiresAt || null,
      message: result.alreadyProcessed
        ? "Premium membership was already activated for this transaction."
        : "Premium membership activated successfully.",
    });
  } catch (error) {
    console.error("Premium Activation Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
