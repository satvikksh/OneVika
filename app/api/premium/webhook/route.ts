import { NextResponse } from "next/server";

import { dbConnect } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { applyPremiumToUser } from "@/app/lib/premium";
import {
  verifyRazorpayWebhookSignature,
} from "@/app/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  try {
    const isValidSignature = verifyRazorpayWebhookSignature(payload, signature);
    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payload) as {
      type: string;
      data?: {
        object?: {
          id?: string;
          method?: string;
          order_id?: string;
          vpa?: string;
          card?: {
            network?: string;
            last4?: string;
            expiry_month?: number;
            expiry_year?: number;
          };
          metadata?: {
            userId?: string;
          };
          notes?: {
            userId?: string;
          };
        };
      };
    };

    if (event.type !== "payment.captured") {
      return NextResponse.json({ received: true });
    }

    const payment = event.data?.object;
    if (!payment?.id || !payment?.order_id) {
      return NextResponse.json({ received: true });
    }

    const userId = payment.notes?.userId || payment.metadata?.userId;
    if (!userId) {
      return NextResponse.json({ received: true });
    }

    const paymentMethod: {
      type?: string;
      brand?: string;
      last4?: string;
      expMonth?: number;
      expYear?: number;
      vpa?: string;
    } = {
      type: payment.method,
      brand: payment.card?.network,
      last4: payment.card?.last4,
      expMonth: payment.card?.expiry_month,
      expYear: payment.card?.expiry_year,
      vpa: payment.vpa,
    };

    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ received: true });
    }

    await applyPremiumToUser(user, {
      provider: "razorpay",
      paymentIntentId: payment.id || null,
      checkoutSessionId: payment.order_id || null,
      paymentMethod,
    });
    await user.save();

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PREMIUM WEBHOOK ERROR:", error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
