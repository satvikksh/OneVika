import { BrevoClient } from "@getbrevo/brevo";
import { REVIEW_EMAIL } from "@/app/lib/account-policy";

export type ModerationEmailAction = "remove" | "restore" | "warn" | "restrict" | "ban";

export type ModerationEmailResult = { delivered: boolean; error?: string };

const ACTION_COPY: Record<
  ModerationEmailAction,
  { title: string; verb: string; body: string; steps: string[] }
> = {
  remove: {
    title: "Your content has been removed",
    verb: "Content removal",
    body: "One or more of your posts or videos was removed from OrbitByte because it did not follow our community guidelines.",
    steps: [
      "Review our Community Guidelines so you know what is allowed on OrbitByte.",
      "You can keep creating; your profile only shows content that is currently live.",
      "If you believe this decision was made in error, reply to this email with the reference ID above.",
    ],
  },
  restore: {
    title: "Your content has been restored",
    verb: "Content restored",
    body: "Our moderation team reviewed your content and decided to restore it.",
    steps: [
      "No action is needed from you.",
      "Your content is live on OrbitByte again and visible to your followers.",
    ],
  },
  warn: {
    title: "You have received a warning",
    verb: "Account warning",
    body: "We issued a warning to your OrbitByte account because of activity that did not follow our community guidelines.",
    steps: [
      "Review our Community Guidelines carefully.",
      "Further violations may lead to restricted posting or account suspension.",
      "If you believe this was a mistake, reply to this email with the reference ID above.",
    ],
  },
  restrict: {
    title: "Your account has been restricted",
    verb: "Account restriction",
    body: "Your OrbitByte account has been restricted. While this restriction is in place you can no longer create new posts or videos.",
    steps: [
      "You can still log in, browse content, and interact with existing posts.",
      "Posting is re-enabled once our review team lifts the restriction.",
      "If you believe this was a mistake, reply to this email with the reference ID above.",
    ],
  },
  ban: {
    title: "Your account has been suspended",
    verb: "Account suspension",
    body: "Your OrbitByte account has been suspended because of repeated or serious violations of our community guidelines.",
    steps: [
      "While suspended you cannot post, comment, or interact with content.",
      "Repeated or serious violations may lead to a permanent ban.",
      "If you believe this was a mistake, reply to this email with the reference ID above.",
    ],
  },
};

export async function sendModerationEmail({
  email,
  name,
  action,
  contentType,
  reason,
  referenceId,
}: {
  email?: string | null;
  name?: string | null;
  action: ModerationEmailAction;
  contentType: "post" | "video";
  reason?: string;
  referenceId?: string;
}): Promise<ModerationEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;
  const supportEmail = process.env.SUPPORT_EMAIL || "support@orbitbyte.com";

  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return { delivered: false, error: "This user has no email address on file." };
  }
  if (!apiKey || !senderEmail) {
    return { delivered: false, error: "Email is not configured." };
  }

  const copy = ACTION_COPY[action];
  const typeLabel = contentType === "video" ? "Video" : "Post";
  const displayName = String(name || "").trim() || "there";
  const reference = String(referenceId || "").trim() || "N/A";
  const reasonText = String(reason || "").trim() || "Policy violation";

  const nextSteps = copy.steps.map(
    (step) => `<li style="margin:6px 0;line-height:1.6">${step}</li>`
  ).join("");

  try {
    const brevo = new BrevoClient({ apiKey });
    await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: "OrbitByte", email: senderEmail },
      to: [{ email: normalized }],
      subject: `OrbitByte · ${copy.title}`,
      textContent: [
        `Hi ${displayName},`,
        copy.body,
        `Action: ${copy.verb}`,
        `Content type: ${typeLabel}`,
        `Reason: ${reasonText}`,
        `Reference: ${reference}`,
        "Next steps:",
        ...copy.steps,
        `If you need help, contact us at ${supportEmail}.`,
      ].join("\n\n"),
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;background:#07111f;color:#e5eefc;border-radius:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <h1 style="margin:0;color:#60a5fa;font-size:22px">OrbitByte</h1>
            <span style="font-size:11px;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">Moderation Notice</span>
          </div>
          <h2 style="margin:22px 0 10px;font-size:20px;color:#f1f5f9">${copy.title}</h2>
          <p style="line-height:1.7;color:#cbd5e1">${copy.body}</p>
          <div style="margin:20px 0;padding:16px;background:#0f1f35;border:1px solid #1e3a5f;border-radius:14px">
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Action taken</p>
            <p style="margin:0;font-weight:700;color:#e5eefc">${copy.verb} · ${typeLabel}</p>
            <p style="margin:12px 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Reason</p>
            <p style="margin:0;line-height:1.6;color:#f1f5f9">${reasonText}</p>
            <p style="margin:14px 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Reference</p>
            <p style="margin:0;font-family:monospace;font-size:13px;color:#7dd3fc">${reference}</p>
          </div>
          <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Next steps</p>
          <ul style="margin:0 0 24px;padding-left:18px;color:#cbd5e1">${nextSteps}</ul>
          <div style="border-top:1px solid #1e3a5f;padding-top:16px;font-size:12px;color:#94a3b8;line-height:1.7">
            Questions? Contact our support team at <a href="mailto:${supportEmail}" style="color:#60a5fa">${supportEmail}</a>.<br />
            <span style="color:#475569">&copy; ${new Date().getFullYear()} OrbitByte. All rights reserved.</span>
          </div>
        </div>
      `,
    });
    return { delivered: true };
  } catch (error) {
    console.error("MODERATION EMAIL ERROR:", error);
    return {
      delivered: false,
      error:
        error instanceof Error ? error.message : "Email delivery failed",
    };
  }
}

export type UserModerationEmailAction =
  | "verify"
  | "unverify"
  | "suspend"
  | "unsuspend"
  | "ban"
  | "unban"
  | "delete";

const USER_ACTION_COPY: Record<
  UserModerationEmailAction,
  { title: string; verb: string; body: string; steps: string[] }
> = {
  verify: {
    title: "Your account is now verified",
    verb: "Account verified",
    body: "Our team reviewed your account and enabled verification. This confirms your account is genuine and adds a verification mark to your profile.",
    steps: [
      "No action is needed from you.",
      "Your account now appears verified across OrbitByte.",
    ],
  },
  unverify: {
    title: "Your verification status was removed",
    verb: "Verification removed",
    body: "Your account's verification status was removed by our team.",
    steps: [
      "You can continue using OrbitByte normally.",
      "If you believe this was a mistake, reply to this email and we will review your case.",
    ],
  },
  suspend: {
    title: "Your account has been suspended",
    verb: "Account suspended",
    body: "Your OrbitByte account has been temporarily suspended by our team. While the suspension is active you can no longer access feeds, messages, projects, analytics, settings, or other protected features — you will see an Account Suspended screen when you sign in.",
    steps: [
      "While suspended you cannot access feeds, profiles, messages, projects, analytics, or settings.",
      "Your data, posts, videos, followers, following, projects, messages, earnings, and history are all preserved and will be restored automatically when the suspension is lifted.",
      `To request a review of this decision, email ${REVIEW_EMAIL} with the reference ID above and a short explanation.`,
    ],
  },
  unsuspend: {
    title: "Your account is no longer suspended",
    verb: "Account unsuspended",
    body: "Good news — the temporary suspension on your OrbitByte account has been lifted. You can post, comment, and message again.",
    steps: [
      "No action is needed from you.",
      "Remember to follow our community guidelines going forward.",
    ],
  },
  ban: {
    title: "Your account has been banned",
    verb: "Account banned",
    body: "Your OrbitByte account has been banned due to serious or repeated violations of our community guidelines. This is a permanent action.",
    steps: [
      "You will no longer be able to access your account.",
      "Bans are reviewed on a case-by-case basis.",
      "If you believe this was a mistake, reply to this email with the reference ID above.",
    ],
  },
  unban: {
    title: "Your account ban was lifted",
    verb: "Ban lifted",
    body: "Our team reviewed your case and decided to lift the ban on your OrbitByte account. You can sign in and use OrbitByte again.",
    steps: [
      "No action is needed from you.",
      "Follow our community guidelines to keep your account in good standing.",
    ],
  },
  delete: {
    title: "Your OrbitByte account has been deleted",
    verb: "Account deleted",
    body: "Your OrbitByte account and personal data were deleted by our team. This action is permanent.",
    steps: [
      "Your posts and public content may still be retained for policy and safety reasons.",
      "If you have any questions, contact our support team.",
    ],
  },
};

export async function sendUserModerationEmail({
  email,
  name,
  action,
  reason,
  referenceId,
}: {
  email?: string | null;
  name?: string | null;
  action: UserModerationEmailAction;
  reason?: string;
  referenceId?: string;
}): Promise<ModerationEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;
  const supportEmail = process.env.SUPPORT_EMAIL || "support@orbitbyte.com";

  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return { delivered: false, error: "This user has no email address on file." };
  }
  if (!apiKey || !senderEmail) {
    return { delivered: false, error: "Email is not configured." };
  }

  const copy = USER_ACTION_COPY[action];
  const displayName = String(name || "").trim() || "there";
  const reference = String(referenceId || "").trim() || "N/A";
  const reasonText = String(reason || "").trim() || "Policy enforcement";

  const nextSteps = copy.steps
    .map((step) => `<li style="margin:6px 0;line-height:1.6">${step}</li>`)
    .join("");

  const reviewCta =
    action === "suspend"
      ? `<a href="mailto:${REVIEW_EMAIL}?subject=${encodeURIComponent(
          "Account suspension review request"
        )}" style="display:block;margin:20px 0;padding:14px;background:#1e293b;border:1px solid #4f46e5;border-radius:12px;color:#e0e7ff;font-weight:700;text-align:center;text-decoration:none">Request a review · ${REVIEW_EMAIL}</a>`
      : "";

  try {
    const brevo = new BrevoClient({ apiKey });
    await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: "OrbitByte", email: senderEmail },
      to: [{ email: normalized }],
      subject: `OrbitByte · ${copy.title}`,
      textContent: [
        `Hi ${displayName},`,
        copy.body,
        `Action: ${copy.verb}`,
        `Reason: ${reasonText}`,
        `Reference: ${reference}`,
        "Next steps:",
        ...copy.steps,
        ...(action === "suspend"
          ? [`Request a review: ${REVIEW_EMAIL}`]
          : []),
        `If you need help, contact us at ${supportEmail}.`,
      ].join("\n\n"),
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;background:#07111f;color:#e5eefc;border-radius:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <h1 style="margin:0;color:#60a5fa;font-size:22px">OrbitByte</h1>
            <span style="font-size:11px;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">Account Notice</span>
          </div>
          <h2 style="margin:22px 0 10px;font-size:20px;color:#f1f5f9">${copy.title}</h2>
          <p style="line-height:1.7;color:#cbd5e1">${copy.body}</p>
          <div style="margin:20px 0;padding:16px;background:#0f1f35;border:1px solid #1e3a5f;border-radius:14px">
            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Action taken</p>
            <p style="margin:0;font-weight:700;color:#e5eefc">${copy.verb}</p>
            <p style="margin:12px 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Reason</p>
            <p style="margin:0;line-height:1.6;color:#f1f5f9">${reasonText}</p>
            <p style="margin:14px 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Reference</p>
            <p style="margin:0;font-family:monospace;font-size:13px;color:#7dd3fc">${reference}</p>
          </div>
          ${reviewCta}
          <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Next steps</p>
          <ul style="margin:0 0 24px;padding-left:18px;color:#cbd5e1">${nextSteps}</ul>
          <div style="border-top:1px solid #1e3a5f;padding-top:16px;font-size:12px;color:#94a3b8;line-height:1.7">
            Questions? Contact our support team at <a href="mailto:${supportEmail}" style="color:#60a5fa">${supportEmail}</a>.<br />
            <span style="color:#475569">&copy; ${new Date().getFullYear()} OrbitByte. All rights reserved.</span>
          </div>
        </div>
      `,
    });
    return { delivered: true };
  } catch (error) {
    console.error("USER MODERATION EMAIL ERROR:", error);
    return {
      delivered: false,
      error: error instanceof Error ? error.message : "Email delivery failed",
    };
  }
}