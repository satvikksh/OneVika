import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import {
  consumeRateLimit,
  fetchJobs,
  getCachedJobs,
  isSerpKeyConfigured,
  jobParamsHash,
  parseSearchParams,
  setCachedJobs,
} from "@/app/lib/jobs";

export const runtime = "nodejs";

/**
 * GET /api/jobs?q=software+engineer&location=Bhopal,+India&remote=true
 *
 * Searches jobs through SerpApi's google_jobs engine. The key stays
 * server-side. Responses are cached in-memory for 10 minutes; requests are
 * rate-limited per user (shared SerpApi budget with Discover).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseSearchParams(req.nextUrl.searchParams);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const searchParams = parsed.params;

    if (!isSerpKeyConfigured()) {
      return NextResponse.json(
        { error: "Jobs are temporarily unavailable on the server." },
        { status: 503 }
      );
    }

    // 1) Serve from cache first (avoids both SerpApi calls and rate limiting).
    const cacheKey = `${session.user.id}::${jobParamsHash(searchParams)}`;
    const cached = getCachedJobs(cacheKey);
    if (cached) {
      return NextResponse.json({ ...(cached as object), cached: true });
    }

    // 2) Rate limit fresh SerpApi calls.
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

    // 3) Hit SerpApi.
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