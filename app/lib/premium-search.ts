/**
 * Premium Search gate — server-side enforcement for keyword search across
 * the Jobs and Discover sections.
 *
 * Keyword search and filtering are Premium features. Location-based content
 * stays free for every authenticated user, so the gate only blocks requests
 * that try to search/filter by keyword, not location-only requests. This must
 * never be bypassed on the client: the API routes below call
 * `isPremiumSearchAllowed` and reject non-premium keyword requests with 402
 * PREMIUM_REQUIRED.
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getNativeDb } from "@/app/lib/mongodb";
import { isPremiumActive } from "@/app/lib/premium";

const { ObjectId } = mongoose.Types;

/** User-facing message returned when a non-premium user attempts a keyword search. */
export const PREMIUM_SEARCH_MESSAGE =
  "Keyword search and filtering are Premium features. Location-based content is free — upgrade to Premium to search by keywords.";

type PremiumDoc = {
  isPremium?: boolean;
  premiumExpiresAt?: Date | string | null;
};

/**
 * Loads the current user's Premium status from the database. The session does
 * not carry premium flags, so routes re-check the source of truth on every
 * request. Reads only `isPremium` / `premiumExpiresAt` and reuses the canonical
 * `isPremiumActive` helper — no duplicate Premium system.
 */
export async function isPremiumSearchAllowed(userId: string): Promise<boolean> {
  const db = await getNativeDb();
  const user = await db
    .collection<PremiumDoc>("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { isPremium: 1, premiumExpiresAt: 1 } }
    );
  return isPremiumActive(user);
}

/** Standard 402 response for a blocked keyword search. */
export function premiumSearchRequiredResponse(
  message: string = PREMIUM_SEARCH_MESSAGE
): NextResponse {
  return NextResponse.json(
    { error: message, code: "PREMIUM_REQUIRED" },
    { status: 402 }
  );
}