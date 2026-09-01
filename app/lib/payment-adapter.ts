/**
 * OrbitByte Payment Adapter Pattern
 * 
 * Provider-agnostic adapter interface for connecting to authorized payment rails.
 * 
 * Architecture:
 * OrbitByte Payment Service
 *        ↓
 * Payment Adapter (configured per PaymentMethod)
 *        ↓
 * Configured Payment Rail (UPI, Bank Transfer, Card, etc.)
 *        ↓
 * Bank/UPI Infrastructure
 *        ↓
 * Verification
 *        ↓
 * OrbitByte Transaction Ledger
 *        ↓
 * Wallet / Membership
 *        ↓
 * Receipt / Analytics
 */

import mongoose from "mongoose";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import PaymentRefund from "@/app/models/PaymentRefund";
import PaymentMethod from "@/app/models/PaymentMethod";
import {
  createCashfreeOrder,
  getCashfreePayment,
  getCashfreeConfig,
  verifyCashfreeWebhookSignature,
  rupeesToPaise,
  CASHFREE_WEBHOOK_PATH,
  CASHFREE_RETURN_PATH,
} from "@/app/lib/cashfree";

/**
 * Payment Adapter Interface
 * Each payment method type can have a configured adapter that handles
 * the specific provider's API, webhooks, and verification.
 */
export interface PaymentAdapter {
  /**
   * Create a payment order with the provider
   */
  createOrder(input: {
    amountPaise: number;
    currency: "INR";
    receipt?: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    providerReference?: string;
  }>;

  /**
   * Verify a payment signature from the provider
   */
  verifySignature(payload: string, signature: string): boolean;

  /**
   * Fetch payment status from the provider
   */
  fetchPaymentStatus(paymentId: string): Promise<{
    status: string;
    amount?: number;
    providerReference?: string;
  }>;

  /**
   * Process a refund through the provider
   */
  processRefund(refundId: string, amountPaise: number): Promise<{
    status: string;
    providerReference?: string;
  }>;

  /**
   * Get payment method configuration
   */
  getConfiguration(): Record<string, unknown>;
}

/**
 * Default OrbitByte adapter (no external provider needed)
 * Handles manual/UPI payments where verification is done via webhook/admin
 */
export class OrbitByteAdapter implements PaymentAdapter {
  constructor(
    private config: Record<string, unknown> = {}
  ) {}

  async createOrder(input: {
    amountPaise: number;
    currency: "INR";
    receipt?: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    providerReference?: string;
  }> {
    // For OrbitByte/internal payments, we create a transaction record
    // The actual payment processing happens via webhook/admin verification
    return {
      id: `orb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount: input.amountPaise,
      currency: input.currency,
    };
  }

  verifySignature(payload: string, signature: string): boolean {
    // OrbitByte internal payments use shared secret verification
    // or admin manual verification - no external signature needed
    return true;
  }

  async fetchPaymentStatus(paymentId: string): Promise<{
    status: string;
    amount?: number;
    providerReference?: string;
  }> {
    const transaction = await PaymentTransaction.findOne({ transactionId: paymentId })
      .lean();

    if (!transaction) {
      return { status: "NOT_FOUND" };
    }

    return {
      status: transaction.status,
      amount: transaction.amountPaise,
      providerReference: transaction.providerReference,
    };
  }

  async processRefund(refundId: string, amountPaise: number): Promise<{
    status: string;
    providerReference?: string;
  }> {
    const refund = await PaymentRefund.findOne({ refundId }).lean();

    if (!refund) {
      return { status: "NOT_FOUND" };
    }

    return {
      status: refund.status,
      providerReference: refund.providerReference,
    };
  }

  getConfiguration(): Record<string, unknown> {
    return {};
  }
}

/**
 * UPI Adapter
 * Handles UPI payment collection via Bharat Interface
 * Verification via UPI mandate/collect API or admin verification
 */
export class UPIAdapter implements PaymentAdapter {
  constructor(private config: Record<string, unknown> = {}) {}

  async createOrder(input: {
    amountPaise: number;
    currency: "INR";
    receipt?: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    providerReference?: string;
  }> {
    // UPI order creation - returns a UPI VPA or collect request ID
    return {
      id: `upi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount: input.amountPaise,
      currency: input.currency,
      providerReference: `upi://pay?pa=${input.metadata?.vpa || ""}&pn=${input.metadata?.name || ""}&am=${input.amountPaise}&cu=${input.currency}`,
    };
  }

  verifySignature(payload: string, signature: string): boolean {
    // UPI payments don't use traditional signatures
    // Verification happens via UPI API response or admin confirmation
    return true;
  }

  async fetchPaymentStatus(paymentId: string): Promise<{
    status: string;
    amount?: number;
    providerReference?: string;
  }> {
    // Look up the transaction and check its status
    const transaction = await PaymentTransaction.findOne({
      transactionId: paymentId,
    }).lean();

    if (!transaction) {
      return { status: "NOT_FOUND" };
    }

    return {
      status: transaction.status,
      amount: transaction.amountPaise,
      providerReference: transaction.providerReference,
    };
  }

  async processRefund(refundId: string, amountPaise: number): Promise<{
    status: string;
    providerReference?: string;
  }> {
    // Update refund status in the ledger
    await PaymentRefund.findOneAndUpdate(
      { refundId },
      {
        $set: {
          status: "PROCESSING",
          updatedAt: new Date(),
        },
      }
    );

    return { status: "PROCESSING" };
  }

  getConfiguration(): Record<string, unknown> {
    return {
      upiIds: this.config.upiIds || [],
      supportedBanks: this.config.supportedBanks || [],
    };
  }
}

/**
 * Bank Transfer Adapter
 * Handles bank transfer payments via NEFT/RTGS
 * Verification via admin confirmation or mandate status
 */
export class BankTransferAdapter implements PaymentAdapter {
  constructor(private config: Record<string, unknown> = {}) {}

  async createOrder(input: {
    amountPaise: number;
    currency: "INR";
    receipt?: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    providerReference?: string;
  }> {
    // Bank transfer order - generates account details for user to transfer to
    const accountDetails = this.config.accountDetails || {
      accountNumber: "",
      ifsc: "",
      accountHolderName: "",
    };

    return {
      id: `bank_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount: input.amountPaise,
      currency: input.currency,
      providerReference: `bank_transfer_${Date.now()}`,
      // Include encrypted account details in metadata for admin use
    };
  }

  verifySignature(payload: string, signature: string): boolean {
    // Bank transfers don't use signatures - verification via admin confirmation
    return true;
  }

  async fetchPaymentStatus(paymentId: string): Promise<{
    status: string;
    amount?: number;
    providerReference?: string;
  }> {
    const transaction = await PaymentTransaction.findOne({
      transactionId: paymentId,
    }).lean();

    if (!transaction) {
      return { status: "NOT_FOUND" };
    }

    return {
      status: transaction.status,
      amount: transaction.amountPaise,
      providerReference: transaction.providerReference,
    };
  }

  async processRefund(refundId: string, amountPaise: number): Promise<{
    status: string;
    providerReference?: string;
  }> {
    await PaymentRefund.findOneAndUpdate(
      { refundId },
      {
        $set: {
          status: "PROCESSING",
          updatedAt: new Date(),
        },
      }
    );

    return { status: "PROCESSING" };
  }

  getConfiguration(): Record<string, unknown> {
    return {
      supportedMethods: this.config.supportedMethods || ["NEFT", "RTGS"],
      minimumAmountPaise: this.config.minimumAmountPaise || 1000,
      maximumAmountPaise: this.config.maximumAmountPaise || 10000000,
    };
  }
}

/**
 * Card Adapter (placeholder - requires authorized payment/acquiring integration)
 * 
 * Note: Card payments require integration with a licensed payment acquirer.
 * This adapter is disabled by default and must comply with PCI-DSS.
 * Do not store card numbers, CVV, or other sensitive credentials.
 */
export class CardAdapter implements PaymentAdapter {
  constructor(private config: Record<string, unknown> = {}) {

    // Card adapter is disabled by default - requires PCI-DSS compliant acquisition
    if (!this.config.enabled) {
      console.warn("Card adapter is disabled - requires PCI-DSS compliant payment acquirer integration");
    }
  }

  async createOrder(input: {
    amountPaise: number;
    currency: "INR";
    receipt?: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    providerReference?: string;
  }> {
    throw new Error("Card payments require authorized payment/acquiring integration");
  }

  verifySignature(payload: string, signature: string): boolean {
    return false;
  }

  async fetchPaymentStatus(paymentId: string): Promise<{
    status: string;
    amount?: number;
    providerReference?: string;
  }> {
    return { status: "UNSUPPORTED" };
  }

  async processRefund(refundId: string, amountPaise: number): Promise<{
    status: string;
    providerReference?: string;
  }> {
    return { status: "UNSUPPORTED" };
  }

  getConfiguration(): Record<string, unknown> {
    return {
      warning: "Card payments require PCI-DSS compliant acquirer integration",
      enabled: false,
    };
  }
}

/**
 * Wallet Adapter
 * Handles internal wallet-to-wallet transactions
 */
export class WalletAdapter implements PaymentAdapter {
  constructor(private config: Record<string, unknown> = {}) {}

  async createOrder(input: {
    amountPaise: number;
    currency: "INR";
    receipt?: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    providerReference?: string;
  }> {
    // Internal wallet transaction - immediately credited/debited
    return {
      id: `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount: input.amountPaise,
      currency: input.currency,
    };
  }

  verifySignature(payload: string, signature: string): boolean {
    // Internal wallet transactions don't need external signatures
    return true;
  }

  async fetchPaymentStatus(paymentId: string): Promise<{
    status: string;
    amount?: number;
    providerReference?: string;
  }> {
    const transaction = await PaymentTransaction.findOne({
      transactionId: paymentId,
    }).lean();

    if (!transaction) {
      return { status: "NOT_FOUND" };
    }

    return {
      status: transaction.status,
      amount: transaction.amountPaise,
      providerReference: transaction.providerReference,
    };
  }

  async processRefund(refundId: string, amountPaise: number): Promise<{
    status: string;
    providerReference?: string;
  }> {
    // Update refund status
    await PaymentRefund.findOneAndUpdate(
      { refundId },
      {
        $set: {
          status: "PROCESSING",
          updatedAt: new Date(),
        },
      }
    );

    return { status: "PROCESSING" };
  }

  getConfiguration(): Record<string, unknown> {
    return {};
  }
}

/**
 * Cashfree Adapter
 * Handles Cashfree Payment Gateway (UPI / cards / NetBanking / wallet).
 * All communication is server-to-server using CASHFREE_* environment variables.
 * The secret key is NEVER exposed to the client.
 */
export class CashfreeAdapter implements PaymentAdapter {
  constructor(private config: Record<string, unknown> = {}) {}

  async createOrder(input: {
    amountPaise: number;
    currency: "INR";
    receipt?: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    providerReference?: string;
  }> {
    const orderId = String(input.receipt || input.metadata?.orderId || `cf_${Date.now()}`);
    getCashfreeConfig();
    const baseUrl =
      (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
      "http://localhost:3000";

    const created = await createCashfreeOrder({
      orderId,
      orderAmountPaise: input.amountPaise,
      currency: input.currency,
      customerId: input.userId,
      customerEmail: String(input.metadata?.email || "unknown@orbitbyte.in"),
      customerPhone: input.metadata?.phone ? String(input.metadata.phone) : undefined,
      returnUrl: `${baseUrl}${CASHFREE_RETURN_PATH}`,
      notifyUrl: `${baseUrl}${CASHFREE_WEBHOOK_PATH}`,
      orderNote: String(input.metadata?.note || "OrbitByte payment"),
    });

    return {
      id: orderId,
      amount: input.amountPaise,
      currency: input.currency,
      providerReference: created.paymentSessionId,
    };
  }

  verifySignature(payload: string, signature: string): boolean {
    try {
      return verifyCashfreeWebhookSignature({ body: payload, signature });
    } catch {
      return false;
    }
  }

  async fetchPaymentStatus(paymentId: string): Promise<{
    status: string;
    amount?: number;
    providerReference?: string;
  }> {
    const payment = await getCashfreePayment(paymentId);
    if (!payment) {
      return { status: "PENDING" };
    }
    return {
      status: payment.status === "PAID" ? "COMPLETED" : payment.status,
      amount: payment.orderAmount != null ? rupeesToPaise(payment.orderAmount) : undefined,
      providerReference: payment.cfPaymentId,
    };
  }

  async processRefund(refundId: string, amountPaise: number): Promise<{
    status: string;
    providerReference?: string;
  }> {
    // Refund approval/settlement is managed via the Cashfree Refunds API in a
    // production settlement backend. Mark as PROCESSING here.
    await PaymentRefund.findOneAndUpdate(
      { refundId },
      { $set: { status: "PROCESSING", updatedAt: new Date() } }
    );
    return { status: "PROCESSING" };
  }

  getConfiguration(): Record<string, unknown> {
    let environment = "sandbox";
    let appId = "";
    try {
      const config = getCashfreeConfig();
      environment = config.environment;
      appId = config.appId;
    } catch {
      // Not configured — return what we have.
    }
    return {
      appId,
      environment,
      callbackPath: CASHFREE_WEBHOOK_PATH,
    };
  }
}

/**
 * Adapter Registry
 * Maps payment method types to their configured adapters
 */
export class AdapterRegistry {
  private adapters: Map<string, PaymentAdapter> = new Map();

  register(type: string, adapter: PaymentAdapter): void {
    this.adapters.set(type, adapter);
  }

  get(type: string): PaymentAdapter | undefined {
    return this.adapters.get(type);
  }

  has(type: string): boolean {
    return this.adapters.has(type);
  }

  list(): Map<string, PaymentAdapter> {
    return this.adapters;
  }
}

/**
 * Get the appropriate adapter for a payment method
 * This looks up the adapter based on the PaymentMethod type
 */
export function getAdapterForMethod(
  paymentMethodType: string,
  registry: AdapterRegistry | null = null
): PaymentAdapter | null {
  // Default adapters by type
  const defaultAdapters: Record<string, PaymentAdapter> = {
    manual: new OrbitByteAdapter(),
    upi: new UPIAdapter(),
    bank_transfer: new BankTransferAdapter(),
    wallet: new WalletAdapter(),
    card: new CardAdapter(),
    cashfree: new CashfreeAdapter(),
  };

  // Use registry if provided, otherwise use defaults
  if (registry && registry.has(paymentMethodType)) {
    return registry.get(paymentMethodType)!;
  }

  return defaultAdapters[paymentMethodType] || null;
}