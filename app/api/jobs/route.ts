import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import {
  consumeRateLimit,
  fetchJobs,
  getCachedJobs,
  isJobsApiConfigured,
  jobLocationQuery,
  jobParamsHash,
  parseSearchParams,
  setCachedJobs,
  type JobSearchParams,
} from "@/app/lib/jobs";
import { parseCoord, reverseGeocode } from "@/app/lib/discover";
import {
  isPremiumSearchAllowed,
  premiumSearchRequiredResponse,
} from "@/app/lib/premium-search";

export const runtime = "nodejs";

/**
 * GET /api/jobs?q=software+engineer&location=Bhopal,+India&remote=true
 * GET /api/jobs?lat=23.25&lng=77.41            (non-premium current-location)
 *
 * Searches jobs through SerpAPI's google_jobs engine. The SerpAPI key stays
 * server-side. Responses are cached in-memory for 10 minutes; requests are
 * rate-limited per user. This is intentionally isolated from Discover/news,
 * which uses Serper.
 *
 * Premium enforcement (never client-only):
 * - Premium users may search by keyword and filter freely.
 * - Non-premium users may ONLY fetch jobs for their DETECTED current location:
 *   the only accepted params are `lat`, `lng` and `next_page_token`. The
 *   location string is never taken from the client — it is reverse-geocoded
 *   from the coordinates on the server, so a non-premium user can not search,
 *   change or filter by location (or keyword) by calling this endpoint.
 *   Sending `q`, `location` or any filter param → 402 PREMIUM_REQUIRED.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const premium = await isPremiumSearchAllowed(session.user.id);

    let searchParams: JobSearchParams;

    if (premium) {
      // Full keyword search + filters for Premium users (existing behavior).
      const parsed = parseSearchParams(req.nextUrl.searchParams);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      searchParams = parsed.params;
    } else {
      // Non-premium: detected current-location only. Coordinates are the only
      // accepted input; the location label is resolved server-side.
      const allowedKeys = new Set(["lat", "lng", "next_page_token"]);
      const forbidden = [...req.nextUrl.searchParams.keys()].filter(
        (key) => !allowedKeys.has(key)
      );
      if (forbidden.length > 0) {
        return premiumSearchRequiredResponse();
      }

      const lat = parseCoord(req.nextUrl.searchParams.get("lat"), -90, 90);
      const lng = parseCoord(req.nextUrl.searchParams.get("lng"), -180, 180);
      if (lat === null || lng === null) {
        return NextResponse.json(
          { error: "A detected current location is required. Location search is a Premium feature." },
          { status: 400 }
        );
      }

      const location = await reverseGeocode(lat, lng);
      if (!location?.label) {
        return NextResponse.json(
          { error: "Couldn't resolve your current location. Please try again." },
          { status: 400 }
        );
      }

      const nextPageToken = (req.nextUrl.searchParams.get("next_page_token") || "").trim();
      searchParams = {
        q: jobLocationQuery(location.label),
        location: location.label,
        nextPageToken: nextPageToken || undefined,
      };
    }

    if (!isJobsApiConfigured()) {
      return NextResponse.json(
        { error: "Jobs are temporarily unavailable on the server." },
        { status: 503 }
      );
    }

    // 1) Serve from cache first (avoids both SerpAPI calls and rate limiting).
    const cacheKey = `${session.user.id}::${jobParamsHash(searchParams)}`;
    const cached = getCachedJobs(cacheKey);
    if (cached) {
      return NextResponse.json({ ...(cached as object), cached: true });
    }

    // 2) Rate limit fresh SerpAPI calls.
    const limit = consumeRateLimit(session.user.id);
    if (!limit.allowed) {
      const retryAfterSec = limit.retryAfterSec ?? 30;
      return NextResponse.json(
        {
          error: "You've reached the jobs limit for now. Please try again shortly.",
          retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    // 3) Hit SerpAPI.
    const result = await fetchJobs(searchParams);
    const payload = {
      location: searchParams.location ?? "",
      jobs: result.jobs,
      hasMore: result.hasMore,
      nextPageToken: result.nextPageToken,
    };
    setCachedJobs(cacheKey, payload);
    return NextResponse.json({ ...payload, cached: false });
  } catch (error) {
    console.error("[Jobs] Search error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load jobs for this search.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}