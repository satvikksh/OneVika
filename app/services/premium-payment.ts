import mongoose, { Types, ClientSession } from "mongoose";

import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import type { IPaymentTransaction } from "@/app/models/PaymentTransaction";
import Order from "@/app/models/Order";
import User from "@/app/models/User";
import PremiumPlan from "@/app/models/PremiumPlan";
import PremiumMembership from "@/app/models/PremiumMembership";
import { applyPremiumToUser, isPremiumActive } from "@/app/lib/premium";
import { PaymentService } from "@/app/services/payment-service";
import {
  getCashfreePayment,
  rupeesToPaise,
  type CashfreePaymentInfo,
} from "@/app/lib/cashfree";

/**
 * Server-side secure completion of a Cashfree-backed premium membership payment.
 *
 * The Cashfree payment info passed in MUST come from a server-side Cashfree API
 * call (never from the client). This function:
 *   - verifies the amount and currency match the stored order/transaction
 *   - atomically flips the payment PENDING -> COMPLETED (idempotent)
 *   - marks the order PAID
 *   - creates a PremiumMembership (unique per transaction)
 *   - activates premium on the user (extending if renewal)
 *   - credits the wallet ledger
 *
 * A single atomic conditional update is the idempotency semaphore: only one
 * webhook/verify request can win; repeats return alreadyProcessed and never
 * duplicate ledger entries or memberships.
 */
export type PremiumCompletionResult = {
  ok: boolean;
  alreadyProcessed?: boolean;
  transactionId?: string;
  orderId?: string;
  premiumExpiresAt?: Date;
  code?: string;
  reason?: string;
};

async function getPlanForOrder(order: {
  membershipPlan?: string | null;
}) {
  const planKey = order.membershipPlan;
  if (!planKey) return null;
  try {
    return await PremiumPlan.findOne({ key: planKey }).lean();
  } catch {
    return null;
  }
}

async function getDefaultPlanId() {
  const plan = await PremiumPlan.findOne({ isActive: true }).sort({ displayOrder: 1 }).lean();
  return plan?._id || new Types.ObjectId();
}

/**
 * Authoritative verification + completion. cashfreePayment MUST come from a
 * server-side Cashfree call (getCashfreePayment).
 */
async function runCompletion({
  transaction,
  cashfreePayment,
}: {
  transaction: IPaymentTransaction & { _id: Types.ObjectId };
  cashfreePayment: CashfreePaymentInfo;
}): Promise<PremiumCompletionResult> {
  if (transaction.currency !== "INR") {
    return { ok: false, code: "CURRENCY_MISMATCH", reason: "Payment currency is not INR" };
  }

  // Cashfree returns amounts in rupees; verify they match the stored paise amount.
  if (cashfreePayment.orderAmount != null) {
    const verifiedPaise = rupeesToPaise(cashfreePayment.orderAmount);
    if (Math.abs(verifiedPaise - transaction.amountPaise) > 1) {
      return {
        ok: false,
        code: "AMOUNT_MISMATCH",
        reason: `Verified amount ${verifiedPaise} paise does not match order amount ${transaction.amountPaise} paise`,
      };
    }
  }

  if (cashfreePayment.status !== "PAID") {
    const pending =
      String(cashfreePayment.status).toUpperCase() === "PENDING" ||
      String(cashfreePayment.status).toUpperCase() === "ACTIVE" ||
      !cashfreePayment.status;
    return {
      ok: false,
      code: pending ? "PENDING" : "NOT_VERIFIED",
      reason: pending
        ? "Waiting for payment confirmation..."
        : "Payment has not been verified. Premium has not been activated.",
    };
  }

  const order = await Order.findById(transaction.orderId).lean();
  if (!order) {
    return { ok: false, code: "ORDER_NOT_FOUND", reason: "Order not found" };
  }

  const session: ClientSession = await mongoose.startSession();
  session.startTransaction();

  try {
    const updated = await PaymentTransaction.findOneAndUpdate(
      {
        _id: transaction._id,
        status: { $nin: ["COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"] },
      },
      {
        $set: {
          status: "COMPLETED",
          completedAt: new Date(),
          paidAt: new Date(),
          providerPaymentId: cashfreePayment.cfPaymentId,
          providerTxnId: cashfreePayment.cfPaymentId,
          providerReference: cashfreePayment.cfPaymentId,
        },
      },
      { new: true, session }
    );

    const alreadyProcessed = !updated;

    if (alreadyProcessed) {
      await session.commitTransaction();
      session.endSession();
      return {
        ok: true,
        alreadyProcessed: true,
        transactionId: transaction.transactionId,
        orderId: order.orderId,
      };
    }

    await Order.updateOne(
      { _id: order._id, status: { $nin: ["PAID", "REFUNDED"] } },
      { $set: { status: "PAID", completedAt: new Date() } },
      { session }
    );

    const user = await User.findById(transaction.userId).session(session);
    let premiumExpiresAt: Date | undefined;
    if (user) {
      await applyPremiumToUser(user, {
        provider: "orbitbyte",
        paymentIntentId: transaction.transactionId,
        checkoutSessionId: transaction.providerOrderId,
        paymentMethod: { type: "cashfree" },
      });
      await user.save({ session });
      premiumExpiresAt = user.premiumExpiresAt;
    }

    const existing = await PremiumMembership.findOne({
      transactionId: transaction._id,
    }).session(session);

    if (!existing) {
      const plan = await getPlanForOrder(order);
      try {
        await PremiumMembership.create(
          [
            {
              userId: transaction.userId,
              planId: plan?._id || (await getDefaultPlanId()),
              planKey: order.membershipPlan || "monthly",
              planName: plan?.name || "Premium",
              orderId: order._id,
              transactionId: transaction._id,
              pricePaise: transaction.amountPaise,
              currency: "INR",
              status: "ACTIVE",
              activationType: "payment",
              startDate: new Date(),
              expiryDate: user?.premiumExpiresAt || new Date(),
            },
          ],
          { session }
        );
      } catch (error) {
        // Unique index collision with a racing completion: safe, membership exists.
        if ((error as { code?: number }).code !== 11000) {
          throw error;
        }
      }
    }

    await PaymentService.creditWallet(
      transaction.userId,
      transaction.amountPaise,
      "MEMBERSHIP_PURCHASE",
      session
    );

    await session.commitTransaction();
    session.endSession();

    return {
      ok: true,
      alreadyProcessed: false,
      transactionId: transaction.transactionId,
      orderId: order.orderId,
      premiumExpiresAt,
    };
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    throw error;
  }
}

/**
 * Verify a transaction's Cashfree payment server-side and, if successful,
 * complete the premium purchase. Used by /api/premium/activate when the client
 * returns from the Cashfree checkout asking to confirm.
 */
export async function verifyAndCompletePremiumPayment(input: {
  transactionId: string;
  userId: string;
}): Promise<PremiumCompletionResult> {
  await dbConnect();

  const transaction = await PaymentTransaction.findOne({ transactionId: input.transactionId })
    .lean();

  if (!transaction) {
    return { ok: false, code: "TX_NOT_FOUND", reason: "Payment transaction not found" };
  }

  if (transaction.userId.toString() !== input.userId) {
    return { ok: false, code: "ACCESS_DENIED", reason: "Access denied" };
  }

  if (transaction.status === "COMPLETED") {
    const order = transaction.orderId ? await Order.findById(transaction.orderId).lean() : null;
    return {
      ok: true,
      alreadyProcessed: true,
      transactionId: transaction.transactionId,
      orderId: order?.orderId,
    };
  }

  const providerOrderId = transaction.providerOrderId;
  if (!providerOrderId) {
    return { ok: false, code: "NO_PROVIDER_ORDER", reason: "Payment has not been initiated" };
  }

  let cashfreePayment: CashfreePaymentInfo | null;
  try {
    cashfreePayment = await getCashfreePayment(providerOrderId);
  } catch (error) {
    return {
      ok: false,
      code: "VERIFY_ERROR",
      reason: error instanceof Error ? error.message : "Payment verification failed",
    };
  }

  if (!cashfreePayment) {
    return {
      ok: false,
      code: "PENDING",
      reason: "Waiting for payment confirmation...",
    };
  }

  return runCompletion({ transaction, cashfreePayment });
}

/**
 * Complete a payment from the Cashfree webhook using the Cashfree order id.
 * Looks up the Order + transaction, verifies via Cashfree server-side, then
 * completes idempotently. The caller is responsible for webhook signature
 * verification.
 */
export async function completeFromCashfreeWebhook(input: {
  cashfreeOrderId: string;
  cashfreePayment: CashfreePaymentInfo;
}): Promise<PremiumCompletionResult> {
  await dbConnect();

  const order = await Order.findOne({ orderId: input.cashfreeOrderId }).lean();
  if (!order) {
    return {
      ok: false,
      code: "ORDER_NOT_FOUND",
      reason: "Order not found for Cashfree reference",
    };
  }

  const transaction = order.paymentTransactionId
    ? await PaymentTransaction.findById(order.paymentTransactionId).lean()
    : null;

  if (!transaction) {
    return { ok: false, code: "TX_NOT_FOUND", reason: "Payment transaction not found" };
  }

  if (transaction.status === "COMPLETED") {
    return {
      ok: true,
      alreadyProcessed: true,
      transactionId: transaction.transactionId,
      orderId: order.orderId,
    };
  }

  return runCompletion({ transaction, cashfreePayment: input.cashfreePayment });
}

export { isPremiumActive };