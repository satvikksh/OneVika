import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import {
  consumeRateLimit,
  fetchNews,
  getCachedNews,
  isSerpKeyConfigured,
  parseLocationParam,
  setCachedNews,
} from "@/app/lib/discover";
import {
  isPremiumSearchAllowed,
  premiumSearchRequiredResponse,
} from "@/app/lib/premium-search";

export const runtime = "nodejs";

const LOCATION_PARAM = "location";

/**
 * GET /api/discover/news?location=Bhopal
 * GET /api/discover/news?location=Bhopal&q=finance   (premium keyword search)
 *
 * Fetches location-based news through Serper. The key stays server-side.
 * Responses are cached in-memory for 5 minutes; requests are rate-limited
 * per user to avoid burning Serper credits.
 *
 * Premium enforcement (never client-only):
 * - Premium users may pass a keyword (`q`) on top of the location.
 * - Non-premium users may only make LOCATION-BASED requests: the only accepted
 *   query param is `location`. Any extra param (keyword, search term, filter,
 *   etc.) is rejected with 402 PREMIUM_REQUIRED, so a non-premium user can
 *   never turn a location request into a keyword search.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const premium = await isPremiumSearchAllowed(session.user.id);

    if (!premium) {
      const forbiddenKeys = [...req.nextUrl.searchParams.keys()].filter(
        (key) => key !== LOCATION_PARAM
      );
      if (forbiddenKeys.length > 0) {
        return premiumSearchRequiredResponse();
      }
    }

    const location = parseLocationParam(req.nextUrl.searchParams.get(LOCATION_PARAM));
    if (!location) {
      return NextResponse.json(
        { error: "A valid location query param is required." },
        { status: 400 }
      );
    }

    if (!isSerpKeyConfigured()) {
      return NextResponse.json(
        { error: "News is temporarily unavailable on the server." },
        { status: 503 }
      );
    }

    // 1) Serve from cache first (avoids both Serper calls and rate limiting).
    const { key, data: cached } = getCachedNews(session.user.id, location);
    if (cached) {
      return NextResponse.json({ ...(cached as object), cached: true });
    }

    // 2) Rate limit fresh Serper calls.
    const limit = consumeRateLimit(session.user.id);
    if (!limit.allowed) {
      const retryAfterSec = limit.retryAfterSec ?? 30;
      return NextResponse.json(
        {
          error: "You've reached the news limit for now. Please try again shortly.",
          retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    // 3) Hit Serper.
    const keyword = premium ? (req.nextUrl.searchParams.get("q") || "").trim() : "";
    const articles = await fetchNews(location, keyword || undefined);
    const payload = { location, articles };
    setCachedNews(key, payload);
    return NextResponse.json({ ...payload, cached: false });
  } catch (error) {
    console.error("[Discover] News error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load news for this location.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}