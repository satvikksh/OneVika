import crypto from "crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function getRazorpayKeyId() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("Missing RAZORPAY_KEY_ID");
  return keyId;
}

function getRazorpayKeySecret() {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error("Missing RAZORPAY_KEY_SECRET");
  return keySecret;
}

function getRazorpayWebhookSecret() {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
  return webhookSecret;
}

function getRazorpayBasicAuth() {
  return Buffer.from(`${getRazorpayKeyId()}:${getRazorpayKeySecret()}`).toString(
    "base64",
  );
}

async function razorpayRequest<T = unknown>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
  },
) {
  const method = options?.method || "GET";
  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${getRazorpayBasicAuth()}`,
      "Content-Type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(options?.body || {}) : undefined,
  });

  const json = await response.json();
  if (!response.ok) {
    const message =
      (json as { error?: { description?: string } })?.error?.description ||
      "Razorpay request failed";
    throw new Error(message);
  }

  return json as T;
}

export function getRazorpayPublicKey() {
  return getRazorpayKeyId();
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  currency: string;
  receipt: string;
  userId: string;
}) {
  return razorpayRequest<{
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    notes?: { userId?: string };
  }>("/orders", {
    method: "POST",
    body: {
      amount: input.amountPaise,
      currency: input.currency.toUpperCase(),
      receipt: input.receipt,
      notes: {
        userId: input.userId,
      },
      payment_capture: 1,
    },
  });
}

export async function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest<{
    id: string;
    method?: string;
    card?: {
      network?: string;
      last4?: string;
      expiry_month?: number;
      expiry_year?: number;
    };
    vpa?: string;
    order_id?: string;
  }>(`/payments/${paymentId}`);
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const body = `${input.orderId}|${input.paymentId}`;
  const expected = crypto
    .createHmac("sha256", getRazorpayKeySecret())
    .update(body, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(input.signature, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export function verifyRazorpayWebhookSignature(payload: string, signature?: string | null) {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", getRazorpayWebhookSecret())
    .update(payload, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
