import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/app/lib/mongodb";
import Order from "@/app/models/Order";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import User from "@/app/models/User";
import { getPaytmConfig, verifyChecksum } from "@/app/lib/paytm";
import { completeFromPaytmCallback } from "@/app/services/premium-payment";
import { sendPaymentEmail } from "@/app/lib/payment-email";

export const runtime = "nodejs";

/**
 * Paytm payment callback (server-to-server).
 *
 * Paytm POSTs the transaction result here after the user completes/cancels on
 * the gateway. The callback body is NOT trusted on its own — it is only a
 * trigger. We always re-verify the authoritative status from Paytm
 * (getPaytmTransactionStatus) before completing anything, and completion is
 * idempotent.
 *
 *  1. Verify the CHECKSUMHASH signature.
 *  2. Reconcile from the authoritative Paytm status.
 *  3. Complete the premium purchase atomically only on TXN_SUCCESS.
 */
export async function POST(req: NextRequest) {
  const text = await req.text();
  const params = parseForm(text);
  const orderId = String(params["ORDERID"] || "");

  try {
    const config = getPaytmConfig();

    // (1) Signature verification — reject tampered callbacks.
    if (!verifyChecksum(params, config.merchantKey)) {
      console.error("PAYTM CALLBACK: checksum verification failed", orderId);
      return htmlResponse("Checksum verification failed");
    }

    // Authoritative completion (verifies Paytm status server-side + amount).
    const result = await completeFromPaytmCallback({ paytmOrderId: orderId });

    if (result.ok) {
      if (!result.alreadyProcessed) {
        await sendConfirmationEmail(orderId).catch(() => {});
      }
      return htmlResponse("OK");
    }

    if (result.code === "ORDER_NOT_FOUND") {
      console.error("PAYTM CALLBACK: order not found", orderId);
      return htmlResponse("Order not found");
    }

    if (result.code === "PENDING") {
      // Payment is pending — leave the transaction/order PENDING (not failed,
      // not activated). The expiry job will reconcile it later.
      return htmlResponse("Pending");
    }

    if (result.code === "NOT_VERIFIED") {
      // Paytm says the payment isn't successful — mark failed, premium stays
      // INACTIVE.
      await markFailed(orderId).catch(() => {});
      return htmlResponse("Payment not verified");
    }

    if (result.code === "AMOUNT_MISMATCH" || result.code === "CURRENCY_MISMATCH") {
      // A mismatch signals a tampered or corrupted record. Keep pending and
      // flag; do not activate.
      console.error("PAYTM CALLBACK mismatch:", result.code, orderId, result.reason);
      return htmlResponse(result.reason || "Payment verification mismatch");
    }

    return htmlResponse(result.reason || "Payment could not be verified");
  } catch (error) {
    console.error("PAYTM CALLBACK ERROR:", error);
    return htmlResponse("Internal error");
  }
}

/**
 * Mark the order + transaction FAILED (payment not verified). Premium stays
 * INACTIVE. Only flips non-terminal states; idempotent.
 */
async function markFailed(orderId: string) {
  await dbConnect();
  const order = await Order.findOne({ orderId }).lean();
  if (!order) return;
  const transaction = order.paymentTransactionId
    ? await PaymentTransaction.findById(order.paymentTransactionId).lean()
    : null;
  if (!transaction) return;

  await PaymentTransaction.updateOne(
    { _id: transaction._id, status: { $nin: ["COMPLETED", "FAILED", "REFUNDED"] } },
    { $set: { status: "FAILED", failedAt: new Date() } }
  ).exec();
  await Order.updateOne(
    { _id: order._id, status: { $nin: ["PAID", "FAILED", "REFUNDED"] } },
    { $set: { status: "FAILED" } }
  ).exec();
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

function parseForm(text: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const url = new URLSearchParams(text);
    url.forEach((value, key) => {
      params[key] = value;
    });
  } catch {
    // malformed body — leave empty
  }
  return params;
}

function htmlResponse(message: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><body><h1>${escapeHtml(message)}</h1></body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
