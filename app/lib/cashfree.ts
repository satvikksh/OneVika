import { createHmac } from "node:crypto";

/**
 * Cashfree Payment Gateway integration (server-side only).
 *
 * NEVER import this module from a client component. It reads CASHFREE_SECRET_KEY
 * from the server environment and performs server-to-server calls to Cashfree.
 * No secret is ever exposed to the browser.
 */

export const CASHFREE_API_VERSION = "2023-08-01";

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  environment: string;
  baseUrl: string;
}

export function getCashfreeConfig(): CashfreeConfig {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const environment = process.env.CASHFREE_ENVIRONMENT || "sandbox";

  if (!appId || !secretKey) {
    throw new Error(
      "Cashfree payment gateway is not configured (CASHFREE_APP_ID / CASHFREE_SECRET_KEY missing)"
    );
  }

  const env = environment.toLowerCase();
  const baseUrl = env === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

  return { appId, secretKey, environment: env, baseUrl };
}

export const CASHFREE_WEBHOOK_PATH = "/api/payments/cashfree/webhook";
export const CASHFREE_RETURN_PATH = "/premium/payment-result";

/**
 * Centralized, valid Cashfree `order_meta.payment_methods` codes.
 *
 * These are Cashfree's official codes — NEVER send internal OrbitByte names
 * (e.g. "card", "netbanking", "wallet") here. Only include methods actually
 * enabled on the Cashfree merchant account.
 */
export const CASHFREE_PAYMENT_METHODS =
  "upi,cc,dc,nb,app,paylater";

/**
 * Map internal OrbitByte payment-method names to Cashfree codes (informational,
 * used for reference/validation and to avoid mixing internal names with the
 * Cashfree API's codes).
 */
export const CASHFREE_METHOD_MAP: Record<string, string> = {
  upi: "upi",
  card: "cc,dc",
  netbanking: "nb",
  wallet: "app",
};

function paiseToRupeesNumber(paise: number) {
  return paise / 100;
}

/** Convert integer paise to a rupee string for the Cashfree API (e.g. "499.00"). */
export function paiseToRupeesString(paise: number) {
  return paiseToRupeesNumber(paise).toFixed(2);
}

/** Build the app base URL used for return/notify URLs. */
export function getAppBaseUrl() {
  return (
    (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function authHeaders(config: CashfreeConfig) {
  return {
    "x-api-version": CASHFREE_API_VERSION,
    "x-client-id": config.appId,
    "x-client-secret": config.secretKey,
    "Content-Type": "application/json",
  };
}

export type CashfreeOrderResult = {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  orderStatus: string;
  paymentSessionId: string;
  orderToken?: string;
  orderNote?: string;
};

/**
 * Create a Cashfree order (POST /pg/orders). Returns the payment_session_id
 * needed to open the Cashfree hosted checkout.
 */
export async function createCashfreeOrder(input: {
  orderId: string;
  orderAmountPaise: number;
  currency: string; // INR
  customerId: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  returnUrl: string;
  notifyUrl: string;
  orderNote?: string;
}): Promise<CashfreeOrderResult> {
  const config = getCashfreeConfig();

  const body: Record<string, unknown> = {
    order_id: input.orderId,
    order_amount: paiseToRupeesNumber(input.orderAmountPaise),
    order_currency: input.currency,
    order_note: input.orderNote || "OrbitByte Premium Membership",
    customer_details: {
      customer_id: input.customerId,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone || "9999999999",
      customer_name: input.customerName,
    },
    order_meta: {
      return_url: input.returnUrl,
      notify_url: input.notifyUrl,
      payment_methods: CASHFREE_PAYMENT_METHODS,
    },
  };

  // Development-only logging. Never logs the secret key or credentials.
  if (config.environment !== "production") {
    console.log("Cashfree payment methods:", CASHFREE_PAYMENT_METHODS.split(","));
  }

  const response = await fetch(`${config.baseUrl}/orders`, {
    method: "POST",
    headers: authHeaders(config),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    const msg = (json as { message?: string })?.message || `Cashfree create order failed (${response.status})`;
    throw new Error(msg);
  }

  const paymentSessionId = String(json.payment_session_id || "");
  if (!paymentSessionId) {
    throw new Error("Cashfree did not return a payment session id");
  }

  return {
    orderId: String(json.order_id || input.orderId),
    orderAmount: Number(json.order_amount || 0),
    orderCurrency: String(json.order_currency || input.currency),
    orderStatus: String(json.order_status || "ACTIVE"),
    paymentSessionId,
    orderToken: (json.order_token as string) || undefined,
    orderNote: (json.order_note as string) || input.orderNote,
  };
}

/**
 * Cashfree payment status values (subset).
 * PAID is the only status that indicates a successfully settled payment.
 */
export type CashfreePaymentStatus =
  | "PAID"
  | "PENDING"
  | "FAILED"
  | "USER_DROPPED"
  | "CANCELLED"
  | "EXPIRED"
  | "VOID"
  | string;

export interface CashfreePaymentInfo {
  status: CashfreePaymentStatus;
  cfPaymentId?: string;
  orderId?: string;
  orderAmount?: number;
  orderCurrency?: string;
  paymentMessage?: string;
  paymentMethod?: string;
  paymentChannel?: string;
  failureReason?: string;
  customerEmail?: string;
  raw?: Record<string, unknown>;
}

/**
 * Fetch the authoritative payment status from Cashfree
 * (GET /pg/orders/{order_id}/payments). This is the secure source of truth.
 */
export async function getCashfreePayment(
  orderId: string
): Promise<CashfreePaymentInfo | null> {
  const config = getCashfreeConfig();

  const response = await fetch(
    `${config.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
    {
      method: "GET",
      headers: {
        "x-api-version": CASHFREE_API_VERSION,
        "x-client-id": config.appId,
        "x-client-secret": config.secretKey,
      },
      cache: "no-store",
    }
  );

  const json = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    // 404 (no payments yet) is a valid "still pending" outcome.
    if (response.status === 404) return null;
    throw new Error(
      `Cashfree payment status failed (${response.status}): ${(json as { message?: string })?.message || "unknown error"}`
    );
  }

  const data = Array.isArray(json) ? json : (json as Record<string, unknown>);
  const entries = Array.isArray(data) ? data : (data?.payload as unknown[]) || (data?.data as unknown[]) || [];

  if (!Array.isArray(entries) || entries.length === 0) return null;

  const latest = entries[entries.length - 1] as Record<string, unknown>;

  return {
    status: String(latest.payment_status || latest.order_status || ""),
    cfPaymentId: latest.cf_payment_id ? String(latest.cf_payment_id) : undefined,
    orderId: latest.order_id ? String(latest.order_id) : orderId,
    orderAmount: latest.order_amount != null ? Number(latest.order_amount) : undefined,
    orderCurrency: latest.order_currency ? String(latest.order_currency) : undefined,
    paymentMessage: latest.payment_message ? String(latest.payment_message) : undefined,
    paymentMethod: latest.payment_method ? String(latest.payment_method) : undefined,
    paymentChannel: latest.payment_channel ? String(latest.payment_channel) : undefined,
    failureReason: latest.failure_reason ? String(latest.failure_reason) : undefined,
    customerEmail:
      latest.customer_details && typeof latest.customer_details === "object"
        ? String(
            (latest.customer_details as Record<string, unknown>).email || (latest as Record<string, unknown>).customer_email || ""
          ) || undefined
        : undefined,
    raw: latest,
  };
}

/**
 * Alias for getCashfreePayment — the authoritative status source. Kept in the
 * public surface for the payment service to consume.
 */
export function getCashfreeOrderStatus(orderId: string) {
  return getCashfreePayment(orderId);
}

/**
 * Verify the Cashfree webhook signature.
 *
 * Cashfree signs every webhook with an HMAC-SHA256 using the merchant secret
 * key, base64-encoded, sent in the `x-webhook-signature` header. We recompute it
 * from the raw request body and compare (constant-time) to reject tampering.
 */
export function verifyCashfreeWebhookSignature({
  body,
  signature,
  secretKey,
}: {
  body: string;
  signature: string;
  secretKey?: string;
}): boolean {
  if (!signature) return false;
  const key = secretKey || getCashfreeConfig().secretKey;
  const expected = createHmac("sha256", key).update(body, "utf8").digest("base64");
  const received = String(signature || "").trim();
  const a = Buffer.from(expected, "base64");
  const b = Buffer.from(received, "base64");
  if (a.length !== b.length) return false;
  return crypto_timingSafeEqual(a, b);
}

function crypto_timingSafeEqual(a: Buffer, b: Buffer) {
  // Constant-time comparison without importing the full crypto module again.
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100);
}
