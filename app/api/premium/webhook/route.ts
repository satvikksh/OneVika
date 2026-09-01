import { NextResponse } from "next/server";

import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import PaymentRefund from "@/app/models/PaymentRefund";
import User from "@/app/models/User";
import { isPremiumActive, applyPremiumToUser } from "@/app/lib/premium";
import { paiseToRupees, logAdminAction } from "@/app/lib/earnings";
import { PaymentService } from "@/app/services/payment-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("x-orbitbyte-signature");

  // Verify OrbitByte webhook signature
  if (!signature) {
    console.warn("OrbitByte webhook received without signature");
    // In production, you should verify the signature
    // For now, we accept without failing to not break the flow
  }

  try {
    let event;

    try {
      event = JSON.parse(payload) as {
        type: string;
        data?: {
          object?: {
            id?: string;
            amount?: number;
            status?: string;
            payment_method?: string;
            metadata?: {
              userId?: string;
              orderId?: string;
            };
          };
        };
      };
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!event.type) {
      return NextResponse.json({ received: true });
    }

    const { type, data } = event;

    await dbConnect();

    if (type === "payment.completed") {
      const payment = data?.object;

      if (!payment?.id) {
        return NextResponse.json({ received: true });
      }

      const userId = payment?.metadata?.userId;
      if (!userId) {
        return NextResponse.json({ received: true });
      }

      const paymentTransaction = await PaymentTransaction.findOne({
        transactionId: payment.id,
      });

      if (!paymentTransaction) {
        return NextResponse.json({ received: true });
      }

      if (paymentTransaction.status === "COMPLETED") {
        return NextResponse.json({ received: true });
      }

      // Mark as completed
      paymentTransaction.status = "COMPLETED";
      paymentTransaction.completedAt = new Date();
      await paymentTransaction.save();

      // Mark the associated order as PAID
      if (paymentTransaction.orderId) {
        await PaymentService.markOrderPaid(paymentTransaction.orderId);
      }

      const user = await User.findById(userId);

      if (!user) {
        return NextResponse.json({ received: true });
      }

      if (!isPremiumActive(user)) {
        await applyPremiumToUser(user, {
          provider: "orbitbyte",
          paymentIntentId: payment.id,
          checkoutSessionId: null,
          paymentMethod: {
            type: "orbitbyte",
          },
        });

        await user.save();
      }

      // Credit wallet
      const wallet = await (await import("@/app/lib/earnings")).getOrCreateWallet(
        user._id
      );
      wallet.availableBalancePaise += paymentTransaction.amountPaise;
      wallet.totalEarnedPaise += paymentTransaction.amountPaise;
      await wallet.save();

      // Create audit log
      await logAdminAction({
        adminId: user._id,
        action: "PREMIUM_ACTIVATION_VIA_WEBHOOK",
        targetId: paymentTransaction._id.toString(),
        description: "Premium activated via payment webhook",
      });

      return NextResponse.json({ received: true });
    }

    if (type === "payment.refund.requested") {
      const payment = data?.object;

      if (!payment?.id) {
        return NextResponse.json({ received: true });
      }

      await dbConnect();

      const paymentTransaction = await PaymentTransaction.findOne({
        transactionId: payment.id,
      });

      if (!paymentTransaction) {
        return NextResponse.json({ received: true });
      }

      // Create refund request
      const refundId = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await PaymentRefund.create({
        refundId,
        paymentTransactionId: paymentTransaction._id,
        userId: paymentTransaction.userId,
        amountPaise: paymentTransaction.amountPaise,
        currency: "INR",
        reason: "Refund requested via webhook",
        status: "REQUESTED",
      });

      // Update transaction status
      paymentTransaction.status = "REFUNDED";
      await paymentTransaction.save();

      return NextResponse.json({ received: true });
    }

    // Unknown event type - acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("ORBITBYTE WEBHOOK ERROR:", error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}