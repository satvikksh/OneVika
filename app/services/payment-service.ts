import mongoose, { Types, ClientSession } from "mongoose";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import PaymentMethod, { IPaymentMethod } from "@/app/models/PaymentMethod";
import User, { IUser } from "@/app/models/User";
import Wallet, { IWallet } from "@/app/models/Wallet";
import PaymentRefund from "@/app/models/PaymentRefund";
import Order from "@/app/models/Order";
import { logAdminAction } from "@/app/lib/earnings";

type OrderDoc = InstanceType<typeof Order>;

type PaymentTransactionDoc = IPaymentTransaction & { _id: Types.ObjectId };
type PaymentRefundDoc =
  | (IPaymentRefund & { _id: Types.ObjectId })
  | InstanceType<typeof PaymentRefund>;
type PaymentMethodDoc = IPaymentMethod & { _id: Types.ObjectId };
type UserDoc = IUser & { _id: Types.ObjectId };
type WalletDoc = IWallet & { _id: Types.ObjectId };

export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "PROCESSING"
  | "VERIFICATION_REQUIRED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "USER_DROPPED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface IPaymentTransaction {
  transactionId: string;
  userId: Types.ObjectId;
  orderId?: Types.ObjectId;
  providerOrderId?: string;
  providerPaymentId?: string;
  provider?: "cashfree" | "paytm";
  planId?: Types.ObjectId;
  amountPaise: number;
  currency: "INR";
  paymentMethod: Types.ObjectId | import("@/app/models/PaymentMethod").IPaymentMethod;
  status: PaymentStatus;
  purpose: "membership" | "wallet_credit" | "wallet_debit" | "refund" | "payout" | "other";
  providerReference?: string;
  providerTxnId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  paidAt?: Date;
}

export interface IPaymentRefund {
  refundId: string;
  paymentTransactionId: Types.ObjectId;
  userId: Types.ObjectId;
  amountPaise: number;
  currency: "INR";
  reason?: string;
  status: "REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED" | "REJECTED";
  adminNote?: string;
  providerReference?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

/**
 * OrbitByte Payment Service
 * 
 * Provider-agnostic payment processing service.
 * All payment processing goes through PaymentMethod and PaymentTransaction models.
 * Actual money movement is handled by payment adapters connected via PaymentMethod configuration.
 */

export class PaymentService {

  /**
   * Create a new payment transaction
   */
  static async createTransaction(
    userId: Types.ObjectId,
    amountPaise: number,
    currency: "INR",
    paymentMethodId: Types.ObjectId,
    purpose: "membership" | "wallet_credit" | "wallet_debit" | "refund" | "payout" | "other",
    metadata?: Record<string, unknown>,
    providerReference?: string,
    orderId?: Types.ObjectId
  ): Promise<PaymentTransactionDoc> {
    let transactionId = `orb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const paymentTransaction = await PaymentTransaction.create({
      transactionId,
      userId,
      orderId,
      amountPaise,
      currency,
      paymentMethod: paymentMethodId,
      status: "INITIATED",
      purpose,
      providerReference,
      metadata,
    }).catch(async (error: unknown) => {
      if ((error as { code?: number }).code === 11000) {
        // Duplicate transactionId - generate a new one and retry
        const maxRetries = 5;
        for (let i = 0; i < maxRetries; i++) {
          transactionId = `orb_${Date.now() + i}_${Math.random().toString(36).slice(2, 9)}`;
          try {
            return await PaymentTransaction.create({
              transactionId,
              userId,
              orderId,
              amountPaise,
              currency,
              paymentMethod: paymentMethodId,
              status: "INITIATED",
              purpose,
              providerReference,
              metadata,
            });
          } catch (retryError: unknown) {
            if ((retryError as { code?: number }).code !== 11000) throw retryError;
            continue;
          }
        }
        throw new Error("Unable to generate unique transaction ID after maximum retries");
      }
      throw error;
    });

    return paymentTransaction;
  }

  /**
   * Get a payment transaction by transactionId
   */
  static async getTransaction(transactionId: string): Promise<PaymentTransactionDoc | null> {
    return PaymentTransaction.findOne({ transactionId }).lean();
  }

  /**
   * Get user's payment transactions
   */
  static async getUserTransactions(
    userId: Types.ObjectId,
    options: {
      status?: PaymentStatus;
      purpose?: string;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<PaymentTransactionDoc[]> {
    const filter: { userId: Types.ObjectId; status?: PaymentStatus; purpose?: string } = {
      userId,
    };
    if (options.status) filter.status = options.status;
    if (options.purpose) filter.purpose = options.purpose;

    return PaymentTransaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0);
  }

  /**
   * Update payment transaction status atomically
   */
  static async updateTransactionStatus(
    transactionId: string,
    status: PaymentStatus,
    session?: ClientSession
  ): Promise<PaymentTransactionDoc | null> {
    return PaymentTransaction.findOneAndUpdate(
      { transactionId },
      { 
        status,
        ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
        ...(status === "FAILED" ? { failedAt: new Date() } : {}),
        updatedAt: new Date(),
      },
      { new: true, session }
    );
  }

  /**
   * Atomically mark an order as PAID.
   * Only transitions from PENDING/PAYMENT_PROCESSING to PAID (idempotent-safe).
   */
  static async markOrderPaid(
    orderId: Types.ObjectId | string,
    session?: ClientSession
  ): Promise<OrderDoc | null> {
    return Order.findOneAndUpdate(
      {
        _id: new Types.ObjectId(orderId.toString()),
        status: { $in: ["PENDING", "PAYMENT_PROCESSING"] },
      },
      {
        status: "PAID",
        completedAt: new Date(),
      },
      { new: true, session }
    );
  }

  /**
   * Atomically mark an order as FAILED.
   */
  static async markOrderFailed(
    orderId: Types.ObjectId | string,
    session?: ClientSession
  ): Promise<OrderDoc | null> {
    return Order.findOneAndUpdate(
      { _id: new Types.ObjectId(orderId.toString()) },
      { status: "FAILED" },
      { new: true, session }
    );
  }

  /**
   * Process payment through the configured payment method adapter
   * This is a placeholder - actual processing happens via payment adapters
   */
  static async processPayment(
    transactionId: string,
    adapter?: string
  ): Promise<PaymentTransactionDoc> {
    const transaction = await PaymentTransaction.findById(transactionId).lean();
    if (!transaction) throw new Error("Payment transaction not found");

    // Mark as processing
    await this.updateTransactionStatus(transactionId, "PROCESSING");

    // TODO: Call the appropriate payment adapter based on paymentMethod type
    // For now, this is handled by the webhook/provider callback flow

    return transaction;
  }

  /**
   * Initialize a refund request for a completed payment.
   * Keeps the original payment transaction COMPLETED and creates a separate refund request.
   */
  static async initiateRefund(
    paymentTransactionId: Types.ObjectId,
    reason: string,
    adminId?: Types.ObjectId
  ): Promise<PaymentRefundDoc> {
    const paymentTransaction = await PaymentTransaction.findById(paymentTransactionId).lean();
    if (!paymentTransaction) throw new Error("Payment transaction not found");

    if (paymentTransaction.status !== "COMPLETED") {
      throw new Error("Only completed payments can be refunded");
    }

    // Prevent duplicate pending refunds for the same transaction
    const existing = await PaymentRefund.findOne({
      paymentTransactionId,
      status: { $in: ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING"] },
    }).lean();
    if (existing) {
      throw new Error("A refund is already pending for this payment");
    }

    const refundId = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const refund = await PaymentRefund.create({
      refundId,
      paymentTransactionId: paymentTransaction._id,
      userId: paymentTransaction.userId,
      amountPaise: paymentTransaction.amountPaise,
      currency: "INR",
      reason,
      status: "REQUESTED",
    });

    // Log admin action
    if (adminId) {
      await logAdminAction({
        adminId,
        action: "REFUND_REQUESTED",
        targetId: paymentTransaction._id.toString(),
        description: `Refund requested: ${reason}`,
      });
    }

    return refund;
  }

  /**
   * Process a refund approval or rejection.
   * Approval/rejection only changes the review state - wallet/ledger changes
   * happen on COMPLETED to reflect the final financial settlement.
   */
  static async processRefund(
    refundId: string,
    status: "APPROVED" | "REJECTED",
    adminId: Types.ObjectId,
    reason?: string
  ): Promise<PaymentRefundDoc> {
    const refund = await PaymentRefund.findOneAndUpdate(
      { refundId },
      {
        status,
        ...(reason ? { adminNote: reason } : {}),
        processedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!refund) throw new Error("Refund not found");

    if (status === "REJECTED") {
      const paymentTransaction = await PaymentTransaction.findById(
        refund.paymentTransactionId
      ).lean();
      if (paymentTransaction && paymentTransaction.status === "REFUNDED") {
        // Restore the payment to COMPLETED since the refund was rejected
        await PaymentTransaction.findByIdAndUpdate(paymentTransaction._id, {
          status: "COMPLETED",
          updatedAt: new Date(),
        });
      }
    }

    await logAdminAction({
      adminId,
      action: status === "APPROVED" ? "REFUND_APPROVED" : "REFUND_REJECTED",
      targetId: refund._id.toString(),
      description: `Refund ${status.toLowerCase()}: ${reason || ""}`,
    });

    return refund;
  }

  /**
   * Complete an approved refund: settle the wallet (debit the earlier credit),
   * cancel the membership if applicable, mark the order and transaction as REFUNDED,
   * and record a separate refund ledger entry.
   */
  static async completeRefund(
    refundId: string,
    adminId: Types.ObjectId,
    session?: ClientSession
  ): Promise<PaymentRefundDoc> {
    const refund = await PaymentRefund.findOne({ refundId }).session(session ?? null);
    if (!refund) throw new Error("Refund not found");

    if (refund.status !== "APPROVED") {
      throw new Error("Refund must be approved before it can be completed");
    }

    const paymentTransaction = await PaymentTransaction.findById(
      refund.paymentTransactionId
    ).session(session ?? null);
    if (!paymentTransaction) throw new Error("Associated payment transaction not found");

    // Settle the wallet - reverse the credit recorded at payment time
    await PaymentService.debitWallet(
      refund.userId,
      refund.amountPaise,
      "REFUND",
      session
    );

    // Cancel premium membership if the user still holds it from this payment
    const user = await User.findById(refund.userId).session(session ?? null);
    if (user && user.isPremium) {
      user.isPremium = false;
      user.premiumExpiresAt = null;
      user.premiumPlan = null;
      await user.save({ session });
    }

    // Mark the order as REFUNDED
    if (paymentTransaction.orderId) {
      await Order.findByIdAndUpdate(
        paymentTransaction.orderId,
        { status: "REFUNDED" },
        { session }
      );
    }

    // Mark the payment transaction as REFUNDED
    paymentTransaction.status = "REFUNDED";
    const txMetadata = paymentTransaction.metadata
      ? (paymentTransaction.metadata as unknown as Map<string, unknown>)
      : new Map<string, unknown>();
    txMetadata.set("refundId", refund.refundId);
    paymentTransaction.metadata = txMetadata as unknown as Record<string, unknown>;
    await paymentTransaction.save({ session });

    // Record a separate refund ledger transaction
    const refundLedgerId = `ref_ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await PaymentTransaction.create(
      [
        {
          transactionId: refundLedgerId,
          userId: refund.userId,
          orderId: paymentTransaction.orderId,
          amountPaise: refund.amountPaise,
          currency: "INR",
          status: "REFUNDED",
          purpose: "refund",
          metadata: {
            refundId: refund.refundId,
            sourceTransactionId: paymentTransaction.transactionId,
          },
        },
      ],
      { session: session ?? undefined }
    );

    // Finalize the refund record
    refund.status = "COMPLETED";
    refund.completedAt = new Date();
    await refund.save({ session });

    await logAdminAction({
      adminId,
      action: "REFUND_COMPLETED",
      targetId: refund._id.toString(),
      description: `Refund ${refund.refundId} completed`,
      session,
    });

    return refund;
  }

  /**
   * Get payment method by type from database
   */
  static async getPaymentMethodByType(type: string): Promise<PaymentMethodDoc | null> {
    return PaymentMethod.findOne({ type, status: "active" }).lean();
  }

  /**
   * Get all active payment methods
   */
  static async getActivePaymentMethods(): Promise<PaymentMethodDoc[]> {
    return PaymentMethod.find({ status: "active" }).lean();
  }

  /**
   * Credit wallet with a ledger entry
   * Must be called within a database transaction for atomicity
   */
  static async creditWallet(
    userId: Types.ObjectId,
    amountPaise: number,
    reason: string,
    session?: ClientSession
  ): Promise<void> {
    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: {
          availableBalancePaise: amountPaise,
          totalCreditsPaise: amountPaise,
        },
      },
      { new: true, session }
    );

    if (!wallet) {
      // Create new wallet if not exists
      await Wallet.create(
        [
          {
            userId,
            availableBalancePaise: amountPaise,
            pendingBalancePaise: 0,
            withdrawableBalancePaise: 0,
            totalCreditsPaise: amountPaise,
            totalDebitsPaise: 0,
          },
        ],
        { session }
      );
    }
  }

  /**
   * Debit wallet with a ledger entry
   * Must be called within a database transaction for atomicity
   */
  static async debitWallet(
    userId: Types.ObjectId,
    amountPaise: number,
    reason: string,
    session?: ClientSession
  ): Promise<void> {
    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: {
          availableBalancePaise: -amountPaise,
          totalDebitsPaise: amountPaise,
        },
      },
      { new: true, session, lean: true }
    );

    if (!wallet) throw new Error("Wallet not found for user");

    if (wallet.availableBalancePaise < 0) {
      // Revert the debit
      await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { availableBalancePaise: amountPaise } },
        { session }
      );
      throw new Error("Insufficient wallet balance");
    }
  }

  /**
   * Complete a membership purchase
   * Full lifecycle: transaction -> verification -> order -> membership -> wallet -> receipt
   */
  static async completeMembershipPurchase(
    transactionId: string,
    adminId?: Types.ObjectId
  ): Promise<{
    transaction: PaymentTransactionDoc;
    user: UserDoc;
    wallet: WalletDoc;
  }> {
    const transaction = await PaymentTransaction.findById(transactionId).lean();
    if (!transaction) throw new Error("Payment transaction not found");

    if (transaction.status !== "COMPLETED") {
      throw new Error("Transaction is not completed");
    }

    const user = await User.findById(transaction.userId).lean();

    if (!user) throw new Error("User not found");

    // Premium/membership revenue is platform-level. Never credit a user wallet.
    await PaymentTransaction.updateOne(
      { _id: transaction._id },
      { $set: { revenueType: "premium" } }
    );

    // Log admin action
    if (adminId) {
      await logAdminAction({
        adminId,
        action: "MEMBERSHIP_PURCHASED",
        targetId: transaction._id.toString(),
        description: "Premium membership completed (platform revenue, no wallet credit)",
      });
    }

    return {
      transaction,
      user,
      wallet: await Wallet.findOne({ userId: transaction.userId }).lean(),
    };
  }

  /**
   * Handle failed payment - ensure membership is not activated
   */
  static async handlePaymentFailure(
    transactionId: string,
    adminId?: Types.ObjectId
  ): Promise<PaymentTransactionDoc> {
    const transaction = await this.updateTransactionStatus(transactionId, "FAILED");

    // Log admin action
    if (adminId) {
      await logAdminAction({
        adminId,
        action: "PAYMENT_FAILED",
        targetId: transaction._id.toString(),
        description: "Payment failed - membership not activated",
      });
    }

    return transaction;
  }
}

/**
 * Payment Adapter Interface
 * 
 * Adapters connect the OrbitByte payment system to specific payment providers.
 * Each adapter must implement the following methods:
 * - createOrder(input): Create a payment order
 * - verifySignature(payload, signature): Verify webhook/payment signature
 * - fetchPayment(paymentId): Fetch payment status from provider
 * - refundPayment(refundId, amount): Process a refund
 */
export interface PaymentAdapter {
  createOrder(input: {
    amountPaise: number;
    currency: "INR";
    receipt?: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string; amount: number; currency: string; }>;

  verifySignature(payload: string, signature: string): boolean;

  fetchPayment(paymentId: string): Promise<{
    status: string;
    amount?: number;
    providerReference?: string;
  }>;

  refundPayment(refundId: string, amountPaise?: number): Promise<{
    status: string;
    providerReference?: string;
  }>;
}

/**
 * Get the appropriate adapter for a payment method
 * In a full implementation, this would lookup configured adapters
 */
export function getAdapterForPaymentMethod(
  paymentMethodId: Types.ObjectId
): PaymentAdapter | null {
  // This would be implemented with a registry of configured adapters
  // For now, return null - adapters are configured via PaymentMethod.configuration
  return null;
}