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

export const runtime = "nodejs";

/**
 * GET /api/discover/news?location=Bhopal
 *
 * Fetches location-based news through SerpApi. The key stays server-side.
 * Responses are cached in-memory for 5 minutes; requests are rate-limited
 * per user to avoid burning SerpApi credits.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const location = parseLocationParam(req.nextUrl.searchParams.get("location"));
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

    // 1) Serve from cache first (avoids both SerpApi calls and rate limiting).
    const { key, data: cached } = getCachedNews(session.user.id, location);
    if (cached) {
      return NextResponse.json({ ...(cached as object), cached: true });
    }

    // 2) Rate limit fresh SerpApi calls.
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

    // 3) Hit SerpApi.
    const articles = await fetchNews(location);
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