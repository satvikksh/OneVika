import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { getCashfreeConfig } from "@/app/lib/cashfree";
import { verifyAndCompletePremiumPayment } from "@/app/services/premium-payment";

export const runtime = "nodejs";

/**
 * Cashfree payment verification (server-to-server).
 *
 * The client calls this after returning from the Cashfree hosted checkout. It
 * NEVER trusts the client's status — it re-fetches the authoritative payment
 * status from Cashfree and only activates premium when Cashfree reports PAID
 * for the exact expected amount.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transactionId");
    const orderIdParam = url.searchParams.get("orderId");

    if (!transactionId) {
      return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
    }

    // Ensure Cashfree is configured before proceeding.
    getCashfreeConfig();

    const result = await verifyAndCompletePremiumPayment({
      transactionId,
      userId: session.user.id,
    });

    if (!result.ok) {
      const status =
        result.code === "TX_NOT_FOUND" || result.code === "ORDER_NOT_FOUND"
          ? 404
          : result.code === "ACCESS_DENIED"
            ? 403
            : result.code === "NOT_VERIFIED"
              ? 402
              : 400;
      return NextResponse.json(
        { success: false, error: result.reason, code: result.code, refOrderId: orderIdParam || null },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      transactionId: result.transactionId,
      orderId: result.orderId || orderIdParam || null,
      premiumExpiresAt: result.premiumExpiresAt?.toISOString?.() || result.premiumExpiresAt || null,
    });
  } catch (error) {
    console.error("CASHFREE VERIFY ERROR:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}