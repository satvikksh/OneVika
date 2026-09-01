import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import { paiseToRupees } from "@/app/lib/earnings";

export const runtime = "nodejs";

/**
 * GET /api/payments/[transactionId] - Get payment transaction details
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const transaction = await PaymentTransaction.findOne({
      transactionId,
    })
      .populate("paymentMethod", "name type")
      .lean();

    if (!transaction) {
      return NextResponse.json({ error: "Payment transaction not found" }, { status: 404 });
    }

    // Authorize: user can see their own transactions, admins can see all
    if (
      transaction.userId.toString() !== session.user.id &&
      session.user.role?.includes("ADMIN") === false
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const paymentMethod = transaction.paymentMethod
      ? (transaction.paymentMethod as { name?: string; type?: string })
      : null;

    return NextResponse.json({
      transaction: {
        transactionId: transaction.transactionId,
        orderId: transaction.orderId ? transaction.orderId.toString() : null,
        amount: paiseToRupees(transaction.amountPaise),
        amountPaise: transaction.amountPaise,
        currency: transaction.currency,
        status: transaction.status,
        purpose: transaction.purpose,
        paymentMethod: paymentMethod?.type || null,
        paymentMethodName: paymentMethod?.name || null,
        providerReference: transaction.providerReference,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
        failedAt: transaction.failedAt,
        metadata: transaction.metadata,
      },
    });
  } catch (error) {
    console.error("GET PAYMENT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch payment" },
      { status: 500 }
    );
  }
}
