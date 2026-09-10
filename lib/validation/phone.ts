export type PhoneValidationResult =
  | { valid: true; phone: string; display: string }
  | { valid: false; error: string };

/**
 * Validate a phone number for the OrbitByte payment flow.
 *
 * Accepts valid Indian mobile formats such as `9090407368` and `+919090407368`
 * (also tolerates a leading `0` and `91` without the `+`). Returns the
 * normalized 10-digit number on success so it can be passed to Cashfree as
 * `customer_details.customer_phone` (never `0`, empty or undefined).
 *
 * This is a server-safe module (no `"use client"` directive) and uses only pure
 * JavaScript, so it can be imported by Cashfree order builders and API routes —
 * never a client-only module.
 */
export function validateIndianPhone(value: string): PhoneValidationResult {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return { valid: false, error: "Please enter your phone number." };
  }

  let digits = raw.replace(/[\s\-()\.]/g, "");

  if (/^\+91/.test(digits)) {
    digits = digits.slice(3);
  } else if (digits.length === 12 && /^91/.test(digits)) {
    digits = digits.slice(2);
  }

  if (/^0/.test(digits)) {
    digits = digits.slice(1);
  }

  if (!/^\d{10}$/.test(digits)) {
    return { valid: false, error: "Enter a valid 10-digit Indian mobile number." };
  }

  if (!/^[6-9]/.test(digits)) {
    return { valid: false, error: "Indian mobile numbers must start with 6, 7, 8 or 9." };
  }

  return { valid: true, phone: digits, display: `+91${digits}` };
}
