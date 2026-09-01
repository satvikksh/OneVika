import { BrevoClient } from "@getbrevo/brevo";

export type PaymentEmailType =
  | "activation"
  | "purchase_confirmation"
  | "payment_failure"
  | "membership_expired"
  | "membership_cancelled"
  | "membership_extended"
  | "refund_completed"
  | "refund_requested"
  | "admin_action";

export type PaymentEmailResult = { delivered: boolean; error?: string };

type EmailTemplate = { title: string; headline: string; intro: string; note?: string };

const EMAIL_COPY: Record<PaymentEmailType, EmailTemplate> = {
  activation: {
    title: "Your Premium Membership is Active",
    headline: "Welcome to Premium",
    intro:
      "Your premium membership is now active on OrbitByte. Thank you for upgrading — you can now enjoy all premium features.",
    note: "Manage or view your membership details anytime from your OrbitByte account.",
  },
  purchase_confirmation: {
    title: "Payment Received — Thank You",
    headline: "Payment received",
    intro:
      "We received your payment successfully. Your OrbitByte premium membership has been activated and a receipt is available in your payment history.",
  },
  payment_failure: {
    title: "Payment Failed",
    headline: "We couldn't process your payment",
    intro:
      "We were unable to complete your payment. No charge was made and your premium membership was not activated. You can retry from your OrbitByte account.",
    note: "If you believe this is a mistake, please contact our support team.",
  },
  membership_expired: {
    title: "Your Membership has Expired",
    headline: "Your premium membership has ended",
    intro:
      "Your premium membership has expired. You can renew at any time to continue enjoying premium features on OrbitByte.",
  },
  membership_cancelled: {
    title: "Your Membership was Cancelled",
    headline: "Membership cancelled",
    intro:
      "Your OrbitByte premium membership has been cancelled. Premium features are no longer active on your account.",
    note: "If you believe this was a mistake, please contact our support team.",
  },
  membership_extended: {
    title: "Your Membership was Extended",
    headline: "Membership extended",
    intro:
      "Your OrbitByte premium membership has been extended. Your new expiry date has been updated.",
  },
  refund_completed: {
    title: "Refund Processed",
    headline: "Your refund was processed",
    intro:
      "Your refund has been processed successfully. The amount will be credited back and your premium membership has been revoked.",
  },
  refund_requested: {
    title: "Refund Request Received",
    headline: "We received your refund request",
    intro:
      "We have received your refund request. Our team is reviewing it and will update you once it is processed.",
  },
  admin_action: {
    title: "OrbitByte Account Update",
    headline: "Your premium membership was updated",
    intro:
      "An administrator made a change to your OrbitByte premium membership. Please review the details below.",
    note: "If you believe this is a mistake, please contact our support team.",
  },
};

/**
 * Sends a payment / membership notification email via BREVO.
 * Email delivery failure is never allowed to roll back the underlying
 * database change: this function always resolves (returns delivered:false
 * on failure) and never throws.
 */
export async function sendPaymentEmail({
  email,
  name,
  type,
  amountPaise,
  transactionId,
  orderId,
  reason,
  extra,
}: {
  email?: string | null;
  name?: string | null;
  type: PaymentEmailType;
  amountPaise?: number | null;
  transactionId?: string | null;
  orderId?: string | null;
  reason?: string | null;
  extra?: { label: string; value: string }[];
}): Promise<PaymentEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;
  const supportEmail = process.env.SUPPORT_EMAIL || "support@orbitbyte.com";

  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return { delivered: false, error: "No email address on file." };
  }
  if (!apiKey || !senderEmail) {
    return { delivered: false, error: "Email is not configured." };
  }

  const copy = EMAIL_COPY[type];
  const displayName = String(name || "").trim() || "there";
  const reference = String(transactionId || orderId || reason || "").trim() || "N/A";
  const amountText =
    amountPaise != null
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amountPaise / 100)
      : null;

  const rows: { label: string; value: string }[] = [];
  if (amountText) rows.push({ label: "Amount", value: amountText });
  if (transactionId) rows.push({ label: "Transaction", value: transactionId });
  if (orderId) rows.push({ label: "Order", value: orderId });
  if (reason) rows.push({ label: "Reason", value: reason });
  for (const item of extra || []) rows.push(item);

  const detailRows = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 14px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;white-space:nowrap">${r.label}</td>
        <td style="padding:8px 14px;color:#f1f5f9;font-family:monospace;font-size:13px;text-align:right">${r.value}</td>
      </tr>`
    )
    .join("");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;background:#07111f;color:#e5eefc;border-radius:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <h1 style="margin:0;color:#60a5fa;font-size:22px">OrbitByte</h1>
        <span style="font-size:11px;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">Payment &amp; Membership</span>
      </div>
      <h2 style="margin:22px 0 10px;font-size:20px;color:#f1f5f9">${copy.headline}</h2>
      <p style="line-height:1.7;color:#cbd5e1">${copy.intro}</p>
      ${rows.length ? `
        <div style="margin:20px 0;padding:6px;background:#0f1f35;border:1px solid #1e3a5f;border-radius:14px">
          <table style="width:100%;border-collapse:collapse">${detailRows}</table>
        </div>` : ""}
      ${copy.note ? `<p style="margin:0 0 24px;font-size:13px;color:#94a3b8;line-height:1.6">${copy.note}</p>` : ""}
      <p style="margin:0 0 14px;font-size:12px;color:#64748b">Reference: <span style="font-family:monospace">${reference}</span></p>
      <div style="border-top:1px solid #1e3a5f;padding-top:16px;font-size:12px;color:#94a3b8;line-height:1.7">
        Questions? Contact us at <a href="mailto:${supportEmail}" style="color:#60a5fa">${supportEmail}</a>.<br />
        <span style="color:#475569">&copy; ${new Date().getFullYear()} OrbitByte. All rights reserved.</span>
      </div>
    </div>
  `;

  const textBody = [
    `Hi ${displayName},`,
    copy.intro,
    ...(amountText ? [`Amount: ${amountText}`] : []),
    ...(transactionId ? [`Transaction: ${transactionId}`] : []),
    ...(orderId ? [`Order: ${orderId}`] : []),
    ...(reason ? [`Reason: ${reason}`] : []),
    `Reference: ${reference}`,
    copy.note || "",
    `Contact us at ${supportEmail}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const brevo = new BrevoClient({ apiKey });
    await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: "OrbitByte", email: senderEmail },
      to: [{ email: normalized }],
      subject: `OrbitByte · ${copy.title}`,
      textContent: textBody,
      htmlContent: htmlBody,
    });
    return { delivered: true };
  } catch (error) {
    console.error("PAYMENT EMAIL ERROR:", error);
    return {
      delivered: false,
      error: error instanceof Error ? error.message : "Email delivery failed",
    };
  }
}
