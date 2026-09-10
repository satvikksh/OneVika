"use client";

// Client-safe facade for the shared Indian-phone validator.
//
// The canonical, server-safe implementation lives in `@/lib/validation/phone`
// (no `"use client"` — pure JS, safe for Cashfree order builders and API
// routes). Server code must import from `@/lib/validation/phone` directly and
// must never import this Client Component module.
export { validateIndianPhone } from "@/lib/validation/phone";
export type { PhoneValidationResult } from "@/lib/validation/phone";
