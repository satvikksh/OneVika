import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentMethod from "@/app/models/PaymentMethod";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import Order from "@/app/models/Order";
import PremiumPlan from "@/app/models/PremiumPlan";
import User from "@/app/models/User";
import { isPremiumActive, PREMIUM_DURATION_DAYS } from "@/app/lib/premium";
import { paiseToRupees } from "@/app/lib/earnings";
import {
  createCashfreeOrder,
  paiseToRupeesString,
  getAppBaseUrl,
  getCashfreeConfig,
  CASHFREE_WEBHOOK_PATH,
  CASHFREE_RETURN_PATH,
} from "@/app/lib/cashfree";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { planKey?: string } = {};
  try {
    body = (await req.json()) as { planKey?: string };
  } catch {
    // body optional
  }

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

    if (isPremiumActive(user)) {
      return NextResponse.json(
        { error: "User already has active premium membership" },
        { status: 400 }
      );
    }

    // Resolve the premium plan server-side. The client-provided price is never trusted.
    let plan: InstanceType<typeof PremiumPlan> | null = null;
    if (body.planKey) {
      plan = await PremiumPlan.findOne({ key: body.planKey, isActive: true });
    }
    if (!plan) {
      plan = await PremiumPlan.findOne({ isActive: true }).sort({ displayOrder: 1 });
    }

    // Fallback: if no plan is configured, use env defaults (legacy behavior)
    const amountPaise = plan
      ? plan.pricePaise
      : Number(process.env.PREMIUM_PRICE_CENTS || "4900");
    const currency = (plan?.currency as string) || process.env.PREMIUM_CURRENCY || "INR";
    const planKey = plan?.key || "monthly";
    const planName = plan?.name || "Premium Monthly";
    const durationDays = plan?.durationDays || PREMIUM_DURATION_DAYS;

    // Get or create the Cashfree payment method.
    let paymentMethod = await PaymentMethod.findOne({ type: "cashfree", status: "active" });
    if (!paymentMethod) {
      paymentMethod = await PaymentMethod.create({
        name: "Cashfree",
        type: "cashfree",
        currency: "INR",
      });
    }

    // Create the Order first
    let orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let order;
    let orderAttempts = 0;
    const maxOrderAttempts = 5;

    while (orderAttempts < maxOrderAttempts) {
      try {
        order = await Order.create({
          orderId,
          userId: user._id,
          productType: "membership",
          membershipPlan: planKey,
          amountPaise,
          currency,
          status: "PENDING",
          metadata: {
            plan: planKey,
            planName,
            priceRupees: paiseToRupees(amountPaise),
            durationDays,
          },
        });
        break;
      } catch (error) {
        if ((error as Record<string, unknown>).code === 11000) {
          orderAttempts++;
          orderId = `ord_${Date.now() + orderAttempts}_${Math.random().toString(36).slice(2, 8)}`;
          continue;
        }
        throw error;
      }
    }
    if (orderAttempts >= maxOrderAttempts) {
      throw new Error("Unable to generate unique order ID after maximum retries");
    }

    // Create payment transaction linked to the order, with duplicate handling
    let transactionId = `orb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    let paymentTransaction;
    let createAttempts = 0;
    const maxAttempts = 5;

    while (createAttempts < maxAttempts) {
      try {
        paymentTransaction = await PaymentTransaction.create({
          transactionId,
          userId: user._id,
          orderId: order._id,
          providerOrderId: order.orderId,
          provider: "cashfree",
          planId: plan?._id,
          amountPaise,
          currency,
          paymentMethod: paymentMethod._id,
          purpose: "membership",
          status: "PENDING",
          metadata: {
            product: "premium_membership",
            plan: planKey,
            planName,
            orderId: order.orderId,
            priceRupees: paiseToRupees(amountPaise),
            durationDays,
          },
        });
        break;
      } catch (error) {
        if ((error as Record<string, unknown>).code === 11000) {
          createAttempts++;
          transactionId = `orb_${Date.now() + createAttempts}_${Math.random().toString(36).slice(2, 9)}`;
          continue;
        }
        throw error;
      }
    }
    if (createAttempts >= maxAttempts) {
      throw new Error("Unable to generate unique transaction ID after maximum retries");
    }

    // Link the payment transaction back to the order atomically
    await Order.findByIdAndUpdate(order._id, {
      paymentTransactionId: paymentTransaction._id,
      status: "PAYMENT_PROCESSING",
    });

    // Update user's premiumLastCheckoutSessionId
    user.premiumLastCheckoutSessionId = transactionId;
    await user.save();

    // Initiate the real Cashfree order server-side. Returns a public
    // payment_session_id used to open the Cashfree hosted checkout. The secret
    // key never leaves the server.
    const appBaseUrl = getAppBaseUrl();
    const returnUrl = `${appBaseUrl}${CASHFREE_RETURN_PATH}?transactionId=${transactionId}&orderId=${encodeURIComponent(order.orderId)}`;
    const notifyUrl = `${appBaseUrl}${CASHFREE_WEBHOOK_PATH}`;

    const created = await createCashfreeOrder({
      orderId: order.orderId,
      orderAmountPaise: amountPaise,
      currency: "INR",
      customerId: String(user._id),
      customerEmail: session.user.email,
      customerName: user.name || session.user.name,
      returnUrl,
      notifyUrl,
      orderNote: `OrbitByte Premium - ${planName}`,
    });

    return NextResponse.json({
      transactionId,
      orderId: created.orderId,
      provider: "cashfree",
      checkout: {
        paymentSessionId: created.paymentSessionId,
        orderId: created.orderId,
        amount: paiseToRupeesString(amountPaise),
        amountPaise,
        currency: "INR",
        returnUrl,
        environment: getCashfreeConfig().environment,
      },
      amount: paymentTransaction.amountPaise,
      amountPaise: paymentTransaction.amountPaise,
      currency: paymentTransaction.currency,
      name: "OrbitByte",
      description: "OrbitByte Premium Membership",
      status: paymentTransaction.status,
      purpose: paymentTransaction.purpose,
      paymentMethod: paymentMethod.name,
      amountRupees: paiseToRupees(amountPaise),
      plan: {
        key: planKey,
        name: planName,
        durationDays,
      },
    });
  } catch (error) {
    console.error("CREATE PREMIUM CHECKOUT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start checkout" },
      { status: 500 }
    );
  }
}
