import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import {
  consumeRateLimit,
  fetchYouTubeShorts,
  getCachedShorts,
  isSerpKeyConfigured,
  parseYoutubePage,
  parseYoutubeQuery,
  setCachedShorts,
  shortsCacheKey,
} from "@/app/lib/youtube";

export const runtime = "nodejs";

/**
 * GET /api/youtube/shorts?q=trending+shorts&num=12[&sp=TOKEN][&fresh=1]
 *
 * Fetches YouTube Shorts through SerpApi's youtube engine. The key stays
 * server-side. Responses are cached in-memory for 10 minutes; requests are
 * rate-limited per user (shared SerpApi budget with Discover/Jobs).
 *
 * `sp` passes a SerpApi page token to load the next batch of a query;
 * `fresh=1` bypasses the cache so refresh can surface new content.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseYoutubeQuery(
      req.nextUrl.searchParams.get("q"),
      req.nextUrl.searchParams.get("num")
    );
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const sp = parseYoutubePage(req.nextUrl.searchParams.get("sp"));
    const fresh = req.nextUrl.searchParams.get("fresh") === "1";

    if (!isSerpKeyConfigured()) {
      return NextResponse.json(
        { error: "Shorts are temporarily unavailable on the server." },
        { status: 503 }
      );
    }

    // 1) Serve from cache first — skips both SerpApi calls and rate limiting.
    //    Fresh requests bypass the cache entirely.
    const cacheKey = shortsCacheKey(session.user.id, parsed.q, parsed.num, sp ?? "");
    if (!fresh) {
      const cached = getCachedShorts(cacheKey);
      if (cached) {
        return NextResponse.json({ ...(cached as object), cached: true });
      }
    }

    // 2) Rate limit fresh SerpApi calls (including paginated batches).
    const limit = consumeRateLimit(session.user.id);
    if (!limit.allowed) {
      const retryAfterSec = limit.retryAfterSec ?? 30;
      return NextResponse.json(
        {
          error: "You've reached the Shorts limit for now. Please try again shortly.",
          retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    // 3) Hit SerpApi.
    const { shorts, nextPageToken } = await fetchYouTubeShorts(parsed.q, parsed.num, {
      sp,
      noCache: fresh,
    });
    const payload = { q: parsed.q, shorts, nextPageToken };
    setCachedShorts(cacheKey, payload);
    return NextResponse.json({ ...payload, cached: false });
  } catch (error) {
    console.error("[YouTube] Shorts error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load Shorts for this search.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}