import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import {
  consumeGitHubCall,
  extractGitHubUsername,
  fetchGitHubProfile,
  fetchGitHubUserRepos,
  getCachedGitHubProfile,
  getCachedGitHubSearch,
  getCachedGitHubUserRepos,
  isGitHubConfigured,
  searchGitHubRepos,
} from "@/app/lib/github";

export const runtime = "nodejs";

type SocialUserRow = {
  social?: { github?: string } | null;
};

/**
 * GET /api/github?scope=profile
 * GET /api/github?scope=repos&page=2
 * GET /api/github?scope=search&q=react&page=2
 *
 * Thin proxy for the GitHub Projects section. The GitHub token stays
 * server-side in app/lib/github.ts.
 *
 * - "search" is the global repository index: results come from ANY public user
 *   or organization, for every connected OrbitByte user.
 * - "profile" / "repos" are scoped to the GitHub account the OrbitByte user
 *   connected through their profile's GitHub social link (user.social.github).
 *   Users without a connection get connected:false and "My Repositories" is
 *   hidden — the token owner is never silently shown to other users.
 *
 * Profile, repo pages, and search pages are cached in-memory (served before
 * the rate limit is consumed); fresh GitHub calls are rate-limited per user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isGitHubConfigured()) {
      return NextResponse.json({ configured: false });
    }

    // Resolve the GitHub account this OrbitByte user connected via their
    // profile social links (stored on the users collection).
    await dbConnect();
    const db = mongoose.connection.db;
    const dbUser = db
      ? ((await db
          .collection("users")
          .findOne(
            { _id: new mongoose.Types.ObjectId(session.user.id) },
            { projection: { social: 1 } }
          )) as SocialUserRow | null)
      : null;
    const username = extractGitHubUsername(dbUser?.social?.github);

    const scope = req.nextUrl.searchParams.get("scope") || "profile";
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);

    if (scope === "search") {
      const query = (req.nextUrl.searchParams.get("q") || "").trim();
      if (!query) {
        return NextResponse.json(
          { error: "A search query is required." },
          { status: 400 }
        );
      }

      // Cache-first: cached searches don't touch the rate limit.
      const cached = getCachedGitHubSearch(query, page);
      if (cached) {
        return NextResponse.json({
          configured: true,
          connected: Boolean(username),
          username: username ?? null,
          cached: true,
          page,
          ...cached,
        });
      }

      if (!consumeGitHubCall(session.user.id)) {
        return NextResponse.json(
          { error: "You're searching GitHub too often. Please wait a moment and try again." },
          { status: 429 }
        );
      }

      const result = await searchGitHubRepos(query, page);
      return NextResponse.json({
        configured: true,
        connected: Boolean(username),
        username: username ?? null,
        cached: false,
        page,
        ...result,
      });
    }

    // "profile" and "repos" are only available to users who connected GitHub.
    if (!username) {
      return NextResponse.json({ configured: true, connected: false });
    }

    if (scope === "repos") {
      const cached = getCachedGitHubUserRepos(username, page);
      if (cached) {
        return NextResponse.json({
          configured: true,
          connected: true,
          username,
          cached: true,
          page,
          ...cached,
        });
      }

      if (!consumeGitHubCall(session.user.id)) {
        return NextResponse.json(
          { error: "You're refreshing GitHub data too often. Please wait a moment and try again." },
          { status: 429 }
        );
      }

      const result = await fetchGitHubUserRepos(username, page);
      return NextResponse.json({
        configured: true,
        connected: true,
        username,
        cached: false,
        page,
        ...result,
      });
    }

    const cachedProfile = getCachedGitHubProfile(username);
    if (cachedProfile) {
      return NextResponse.json({
        configured: true,
        connected: true,
        username,
        cached: true,
        ...cachedProfile,
      });
    }

    if (!consumeGitHubCall(session.user.id)) {
      return NextResponse.json(
        { error: "You're refreshing GitHub data too often. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const result = await fetchGitHubProfile(username);
    return NextResponse.json({
      configured: true,
      connected: true,
      username,
      cached: false,
      ...result,
    });
  } catch (error) {
    console.error("[GitHub] Fetch error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load GitHub data for this section.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}