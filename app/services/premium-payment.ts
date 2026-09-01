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
  getPaytmTransactionStatus,
  PaytmPaymentStatus,
} from "@/app/lib/paytm";

/**
 * Server-side secure completion of a Paytm-backed premium membership payment.
 *
 * The Paytm status passed in MUST come from a server-side Paytm API call (never
 * from the client). This function:
 *   - verifies the amount and currency match the stored order/transaction
 *   - atomically flips the payment INITIATED/PENDING -> COMPLETED (idempotent)
 *   - marks the order PAID
 *   - creates a PremiumMembership (unique per transaction)
 *   - activates premium on the user (extending if renewal)
 *   - credits the wallet ledger
 *
 * A single atomic conditional update is the idempotency semaphore: only one
 * callback/activate request can win; repeats return alreadyProcessed and never
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

async function getPlanForOrder(order: any) {
  const planKey = order.membershipPlan;
  if (!planKey) return null;
  try {
    return await PremiumPlan.findOne({ key: planKey }).lean();
  } catch {
    return null;
  }
}

async function runCompletion({
  transaction,
  paytmStatus,
}: {
  transaction: IPaymentTransaction & { _id: Types.ObjectId };
  paytmStatus: PaytmPaymentStatus;
}): Promise<PremiumCompletionResult> {
  // --- Verify amount + currency against the stored order/transaction ---
  if (transaction.currency !== "INR") {
    return { ok: false, code: "CURRENCY_MISMATCH", reason: "Payment currency is not INR" };
  }

  if (paytmStatus.amountPaise !== transaction.amountPaise) {
    return {
      ok: false,
      code: "AMOUNT_MISMATCH",
      reason: `Verified amount ${paytmStatus.amountPaise} paise does not match order amount ${transaction.amountPaise} paise`,
    };
  }

  if (paytmStatus.status !== "TXN_SUCCESS") {
    const pending = String(paytmStatus.status).toUpperCase() === "PENDING";
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

  // Atomic idempotency semaphore: only a non-completed transaction flips to COMPLETED.
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
          providerReference: paytmStatus.bankTxnId || paytmStatus.txnId,
          providerTxnId: paytmStatus.txnId,
        },
      },
      { new: true, session }
    );

    const alreadyProcessed = !updated;

    if (alreadyProcessed) {
      // This transaction was already completed by a prior callback/activate.
      // Commit (no-op writes) and report idempotent success — no duplicate
      // membership, premium renewal, or wallet credit is applied.
      await session.commitTransaction();
      session.endSession();
      return {
        ok: true,
        alreadyProcessed: true,
        transactionId: transaction.transactionId,
        orderId: order.orderId,
      };
    }

    // --- First successful completion: apply all side effects atomically ---

    // Mark order PAID (atomically, same precondition).
    await Order.updateOne(
      { _id: order._id, status: { $nin: ["PAID", "REFUNDED"] } },
      { $set: { status: "PAID", completedAt: new Date() } },
      { session }
    );

    // Activate premium on the user and persist inside the transaction.
    const user = await User.findById(transaction.userId).session(session);
    let premiumExpiresAt: Date | undefined;
    if (user) {
      await applyPremiumToUser(user, {
        provider: "orbitbyte",
        paymentIntentId: transaction.transactionId,
        checkoutSessionId: transaction.providerOrderId,
        paymentMethod: { type: "paytm" },
      });
      await user.save({ session });
      premiumExpiresAt = user.premiumExpiresAt;
    }

    // Idempotency for membership: the unique index on transactionId ensures a
    // membership is created at most once per transaction.
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

    // Credit the wallet ledger for the successful payment (CREDIT).
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

async function getDefaultPlanId() {
  const plan = await PremiumPlan.findOne({ isActive: true }).sort({ displayOrder: 1 }).lean();
  return plan?._id || new Types.ObjectId();
}

/**
 * Verify a transaction's Paytm payment server-side and, if successful, complete
 * the premium purchase. Used by /api/premium/activate when the client returns
 * from the Paytm checkout asking to confirm.
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

  // If already completed, report idempotent success without re-verifying Paytm.
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

  // Authoritative server-to-server verification.
  let paytmStatus: PaytmPaymentStatus;
  try {
    paytmStatus = await getPaytmTransactionStatus(providerOrderId);
  } catch (error) {
    return {
      ok: false,
      code: "VERIFY_ERROR",
      reason: error instanceof Error ? error.message : "Payment verification failed",
    };
  }

  return runCompletion({ transaction, paytmStatus });
}

/**
 * Complete a payment from the Paytm callback using the Paytm order id
 * (ORDERID) posted from the gateway. Looks up the Order + transaction, verifies
 * via Paytm, then completes idempotently.
 */
export async function completeFromPaytmCallback(input: {
  paytmOrderId: string;
}): Promise<PremiumCompletionResult> {
  await dbConnect();

  const order = await Order.findOne({ orderId: input.paytmOrderId }).lean();
  if (!order) {
    return { ok: false, code: "ORDER_NOT_FOUND", reason: "Order not found for Paytm reference" };
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

  // Authoritative server-to-server verification using the Paytm order id.
  const paytmStatus = await getPaytmTransactionStatus(input.paytmOrderId);
  return runCompletion({ transaction, paytmStatus });
}

export { isPremiumActive };
