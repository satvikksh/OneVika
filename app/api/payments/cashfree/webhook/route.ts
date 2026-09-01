import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/app/lib/mongodb";
import Order from "@/app/models/Order";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import User from "@/app/models/User";
import {
  getCashfreeConfig,
  getCashfreePayment,
  verifyCashfreeWebhookSignature,
  type CashfreePaymentInfo,
} from "@/app/lib/cashfree";
import { completeFromCashfreeWebhook } from "@/app/services/premium-payment";
import { sendPaymentEmail } from "@/app/lib/payment-email";

export const runtime = "nodejs";

/**
 * Cashfree payment webhook (server-to-server).
 *
 * Cashfree POSTs the transaction result here asynchronously. The webhook is
 * NOT trusted on its own — the signature is verified against the merchant
 * secret key, and for success we always re-verify the authoritative status
 * from Cashfree (GET /pg/orders/{id}/payments) before completing anything.
 * Completion is idempotent and activates premium even if the user's browser
 * never reaches the return URL.
 *
 *  1. Verify the x-webhook-signature HMAC-SHA256.
 *  2. Reconcile from the authoritative Cashfree payment status.
 *  3. Complete the premium purchase atomically only on PAID.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-webhook-signature") || "";

  try {
    const config = getCashfreeConfig();

    // (1) Signature verification — reject tampered/unauthenticated webhooks.
    if (!verifyCashfreeWebhookSignature({ body: raw, signature, secretKey: config.secretKey })) {
      console.error("CASHFREE WEBHOOK: signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = safeJson(raw) as Record<string, unknown> | null;
    if (!payload) {
      return NextResponse.json({ error: "Bad payload" }, { status: 400 });
    }

    const data = (payload.data || payload) as Record<string, unknown>;
    const order = (data.order || {}) as Record<string, unknown>;
    const payment = (data.payment || {}) as Record<string, unknown>;

    const orderId = String(order.order_id || data.order_id || "");
    const webhookStatus = String(
      payment.payment_status || order.order_status || data.payment_status || ""
    ).toUpperCase();

    if (!orderId) {
      console.error("CASHFREE WEBHOOK: missing order id");
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    // (2) Authoritative server-side fetch of the payment status. For PAID this
    // guards against a forged/inconsistent webhook body.
    let cashfreePayment: CashfreePaymentInfo | null = null;
    if (webhookStatus === "PAID") {
      try {
        cashfreePayment = await getCashfreePayment(orderId);
      } catch (error) {
        console.error("CASHFREE WEBHOOK: status re-verify failed", orderId, error);
        return NextResponse.json({ error: "Verification unavailable" }, { status: 502 });
      }
    }

    if (webhookStatus === "PAID" && !cashfreePayment) {
      // No authoritative payment found yet — not ready to activate.
      return NextResponse.json({ ok: true, status: "pending" }, { status: 200 });
    }

    if (webhookStatus === "PAID") {
      const result = await completeFromCashfreeWebhook({
        cashfreeOrderId: orderId,
        cashfreePayment,
      });

      if (result.ok) {
        if (!result.alreadyProcessed) {
          await sendConfirmationEmail(orderId).catch(() => {});
        }
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      if (result.code === "ORDER_NOT_FOUND") {
        console.error("CASHFREE WEBHOOK: order not found", orderId);
        return NextResponse.json({ ok: true, status: "order_not_found" }, { status: 200 });
      }

      console.error("CASHFREE WEBHOOK completion failed:", result.code, orderId, result.reason);
      return NextResponse.json({ ok: true, status: "not_completed" }, { status: 200 });
    }

    // (3) Non-paid outcomes — record idempotently, premium is NOT activated.
    const outcomeMap: Record<string, string> = {
      FAILED: "FAILED",
      USER_DROPPED: "USER_DROPPED",
      CANCELLED: "CANCELLED",
      EXPIRED: "EXPIRED",
      VOID: "CANCELLED",
    };
    const nextStatus = outcomeMap[webhookStatus];
    if (nextStatus) {
      await recordOutcome(orderId, nextStatus, webhookStatus).catch(() => {});
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("CASHFREE WEBHOOK ERROR:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Record a non-success final/terminal outcome on order + transaction. Never
 * flips COMPLETED/PAID/REFUNDED states. Idempotent.
 */
async function recordOutcome(orderId: string, transactionStatus: string, providerStatus: string) {
  await dbConnect();
  const order = await Order.findOne({ orderId }).lean();
  if (!order) return;
  const transaction = order.paymentTransactionId
    ? await PaymentTransaction.findById(order.paymentTransactionId).lean()
    : null;
  if (!transaction) return;

  const set: Record<string, unknown> = {
    status: transactionStatus,
    "metadata.providerStatus": String(providerStatus),
  };
  if (transactionStatus === "FAILED") set.failedAt = new Date();

  await PaymentTransaction.updateOne(
    { _id: transaction._id, status: { $nin: ["COMPLETED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] } },
    { $set: set }
  ).exec();

  if (transactionStatus === "FAILED" || transactionStatus === "CANCELLED") {
    await Order.updateOne(
      { _id: order._id, status: { $nin: ["PAID", "FAILED", "REFUNDED"] } },
      { $set: { status: "FAILED" } }
    ).exec();
  }
}

async function sendConfirmationEmail(orderId: string) {
  await dbConnect();
  const order = await Order.findOne({ orderId }).lean();
  const transaction = order?.paymentTransactionId
    ? await PaymentTransaction.findById(order.paymentTransactionId).lean()
    : null;
  if (!transaction) return;
  const user = await User.findById(transaction.userId).lean();
  if (!user?.email) return;

  await sendPaymentEmail({
    email: user.email,
    name: user.name,
    type: "purchase_confirmation",
    amountPaise: transaction.amountPaise,
    transactionId: transaction.transactionId,
    orderId,
  });
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}