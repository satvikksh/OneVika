import { createHash } from "node:crypto";

/**
 * Paytm Payment Gateway integration (server-side only).
 *
 * NEVER import this module from a client component. It reads PAYTM_MERCHANT_KEY
 * from the server environment and performs server-to-server calls to Paytm.
 * No secret is ever exposed to the browser.
 */

export interface PaytmConfig {
  mid: string;
  merchantKey: string;
  website: string;
  environment: string;
}

export function getPaytmConfig(): PaytmConfig {
  const mid = process.env.PAYTM_MID;
  const merchantKey = process.env.PAYTM_MERCHANT_KEY;
  const website = process.env.PAYTM_WEBSITE;
  const environment = process.env.PAYTM_ENVIRONMENT;

  if (!mid || !merchantKey) {
    throw new Error(
      "Paytm payment gateway is not configured (PAYTM_MID / PAYTM_MERCHANT_KEY missing)"
    );
  }
  if (!environment) {
    throw new Error("Paytm payment gateway is not configured (PAYTM_ENVIRONMENT missing)");
  }

  return {
    mid,
    merchantKey,
    website: website || "WEB_STAGING",
    environment,
  };
}

export const PAYTM_CALLBACK_PATH = "/api/payments/paytm/callback";

/**
 * Paytm checksum generation. Sorts params by key, builds "k=v&k2=v2..." with
 * RAW values (no URI encoding), appends the merchant key, and returns the
 * SHA-256 hex digest. This matches Paytm's getChecksumFromArray behaviour.
 */
export function generateSignature(
  params: Record<string, string | number | undefined>,
  key: string
): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort();

  const kvString = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");

  return createHash("sha256").update(`${kvString}${key}`).digest("hex");
}

/**
 * Verify a Paytm callback checksum. `params` is the full param map including
 * CHECKSUMHASH. The CHECKSUMHASH value is excluded from signing.
 */
export function verifyChecksum(
  params: Record<string, string | number | undefined>,
  key: string
): boolean {
  const given = String(params["CHECKSUMHASH"] || "");
  if (!given) return false;

  const { CHECKSUMHASH: _omit, ...signingParams } = params;
  const expected = generateSignature(signingParams, key);
  return expected === given;
}

function isoTimestamp() {
  return new Date().toISOString();
}

/**
 * Initiate a Paytm transaction. Returns the TXN_TOKEN used by the Paytm
 * checkout to render the payment options.
 */
export async function initiatePaytmTransaction(input: {
  orderId: string;
  amount: string; // INR rupees as a decimal string, e.g. "499.00"
  custId: string;
  callbackUrl: string;
}): Promise<{ txnToken: string; orderId: string; mid: string }> {
  const config = getPaytmConfig();

  const bodyData = {
    requestType: "Payment",
    mid: config.mid,
    websiteName: config.website,
    orderId: input.orderId,
    callbackUrl: input.callbackUrl,
    txnAmount: {
      value: input.amount,
      currency: "INR",
    },
    userInfo: {
      custId: input.custId,
    },
  };

  const headData: Record<string, string> = {
    channelId: "WEB",
    requestTimestamp: isoTimestamp(),
  };
  headData["signature"] = generateSignature(headData, config.merchantKey);

  const url = `${config.environment}/theia/api/v1/initiateTransaction?mid=${config.mid}&orderId=${input.orderId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ head: headData, body: bodyData }),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => ({}))) as {
    body?: { resultInfo?: { resultStatus?: string; resultMsg?: string }; txnToken?: string };
  };

  if (!response.ok) {
    throw new Error(
      `Paytm initiate failed (${response.status}): ${json?.body?.resultInfo?.resultMsg || "unknown error"}`
    );
  }

  const resultInfo = json?.body?.resultInfo;
  if (resultInfo && resultInfo.resultStatus !== "S" && resultInfo.resultStatus !== "T") {
    throw new Error(`Paytm initiate failed: ${resultInfo.resultMsg || resultInfo.resultStatus}`);
  }

  const txnToken = json?.body?.txnToken;
  if (!txnToken) {
    throw new Error("Paytm did not return a transaction token");
  }

  return { txnToken, orderId: input.orderId, mid: config.mid };
}

export type PaytmTxnStatus = "TXN_SUCCESS" | "TXN_FAILURE" | "PENDING" | string;

export interface PaytmPaymentStatus {
  status: PaytmTxnStatus;
  orderId?: string;
  bankTxnId?: string;
  txnId?: string;
  amountPaise?: number;
  currency?: string;
  raw?: Record<string, unknown>;
}

/**
 * Fetch the authoritative transaction status from Paytm (server-to-server).
 * This is the secure source of truth for whether a payment succeeded.
 */
export async function getPaytmTransactionStatus(
  orderId: string
): Promise<PaytmPaymentStatus> {
  const config = getPaytmConfig();

  const bodyData = { mid: config.mid, orderId };
  const headData: Record<string, string> = {
    clientId: "C11",
    channelId: "WEB",
    requestTimestamp: isoTimestamp(),
  };
  headData["signature"] = generateSignature(headData, config.merchantKey);

  const url = `${config.environment}/theia/api/v1/transactionStatus?mid=${config.mid}&orderId=${encodeURIComponent(orderId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ head: headData, body: bodyData }),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => ({}))) as {
    statusCode?: number;
    body?: Record<string, unknown>;
  };

  if (!response.ok) {
    throw new Error(
      `Paytm status failed (${response.status}): ${JSON.stringify(json?.body || "unknown error")}`
    );
  }

  const body = (json.body || {}) as Record<string, unknown>;

  const txnStatus = String(body["STATUS"] || body["TXNSTATUS"] || body["RESULT"] || "");
  const value = String(body["TXNAMOUNT"] || "0");

  return {
    status: txnStatus,
    orderId: body["ORDERID"] ? String(body["ORDERID"]) : orderId,
    bankTxnId: body["BANKTXNID"] ? String(body["BANKTXNID"]) : undefined,
    txnId: body["TXNID"] ? String(body["TXNID"]) : undefined,
    amountPaise: rupeesToPaise(value),
    currency: body["CURRENCY"] ? String(body["CURRENCY"]) : "INR",
    raw: body,
  };
}

export function rupeesToPaise(value: string | number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function paiseToRupeesString(paise: number): string {
  return (paise / 100).toFixed(2);
}
