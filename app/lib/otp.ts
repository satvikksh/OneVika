import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "crypto";
import { BrevoClient } from "@getbrevo/brevo";

export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_RESEND_DELAY_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_RESENDS = 5;

export function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function generateOtp() {
  return randomInt(100000, 1000000).toString();
}

export function generateOtpSalt() {
  return randomBytes(16).toString("hex");
}

function otpPepper() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for OTP hashing");
  return secret;
}

export function hashOtp(otp: string, salt: string) {
  return createHmac("sha256", otpPepper())
    .update(`${salt}:${otp}`)
    .digest("hex");
}

export function verifyOtp(otp: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(hashOtp(otp, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function generateResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendOtpEmail({
  email,
  otp,
  purpose,
}: {
  email: string;
  otp: string;
  purpose: "registration" | "password-reset";
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;

  if (!apiKey || !senderEmail) {
    throw new Error("BREVO_API_KEY and EMAIL_FROM must be configured");
  }

  const action =
    purpose === "registration" ? "verify your OrbitByte account" : "reset your OrbitByte password";
  const brevo = new BrevoClient({ apiKey });

  await brevo.transactionalEmails.sendTransacEmail({
    sender: { name: "OrbitByte", email: senderEmail },
    to: [{ email }],
    subject:
      purpose === "registration"
        ? "Verify your OrbitByte email"
        : "Reset your OrbitByte password",
    textContent: `Your OrbitByte verification code is ${otp}. It expires in 10 minutes. Never share this code.`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;background:#07111f;color:#e5eefc;border-radius:20px">
        <h1 style="margin:0 0 12px;color:#60a5fa">OrbitByte</h1>
        <p style="line-height:1.6">Use this code to ${action}:</p>
        <div style="margin:24px 0;padding:18px;text-align:center;font-size:34px;font-weight:700;letter-spacing:8px;background:#0f1f35;border:1px solid #2563eb;border-radius:14px">${otp}</div>
        <p style="font-size:13px;color:#9ca3af">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
      </div>
    `,
  });
}
