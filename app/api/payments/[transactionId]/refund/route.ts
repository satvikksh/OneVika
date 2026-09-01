import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import PaymentRefund from "@/app/models/PaymentRefund";
import { paiseToRupees } from "@/app/lib/earnings";
import { sendPaymentEmail } from "@/app/lib/payment-email";

export const runtime = "nodejs";

/**
 * POST /api/payments/[transactionId]/refund - User requests a refund for their own payment
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  let body: { reason?: string } = {};
  try {
    body = (await req.json()) as { reason?: string };
  } catch {
    // ignore body parse errors
  }

  try {
    const { transactionId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const transaction = await PaymentTransaction.findOne({ transactionId }).lean();

    if (!transaction) {
      return NextResponse.json({ error: "Payment transaction not found" }, { status: 404 });
    }

    // Authorize: only the owner of the transaction
    if (transaction.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only completed payments can be refunded
    if (transaction.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Only completed payments can be refunded" },
        { status: 400 }
      );
    }

    // Prevent duplicate refund requests for the same transaction
    const existing = await PaymentRefund.findOne({
      paymentTransactionId: transaction._id,
      status: { $in: ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING"] },
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: "A refund is already pending for this transaction" },
        { status: 400 }
      );
    }

    const refundId = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const refund = await PaymentRefund.create({
      refundId,
      paymentTransactionId: transaction._id,
      userId: transaction.userId,
      amountPaise: transaction.amountPaise,
      currency: "INR",
      reason: body.reason || "Refund requested by user",
      status: "REQUESTED",
    });

    void sendPaymentEmail({
      email: session.user.email,
      name: session.user.name || undefined,
      type: "refund_requested",
      amountPaise: refund.amountPaise,
      transactionId: transaction.transactionId,
    });

    return NextResponse.json(
      {
        refundId: refund.refundId,
        amount: paiseToRupees(refund.amountPaise),
        amountPaise: refund.amountPaise,
        currency: refund.currency,
        status: refund.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REFUND REQUEST ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to request refund" },
      { status: 500 }
    );
  }
}
