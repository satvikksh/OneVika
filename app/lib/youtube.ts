/**
 * YouTube lib — server-side helpers for the /feed YouTube Shorts mode.
 *
 * Uses SerpApi's youtube engine. The SerpApi key is read from SERPAPI_KEY
 * (server-only) via the shared discover helpers and is NEVER exposed to the
 * client. Generic fetch/rate-limit helpers are reused from app/lib/discover.ts
 * rather than duplicated.
 */

import {
  consumeRateLimit,
  fetchWithTimeout,
  isSerpKeyConfigured,
} from "@/app/lib/discover";

const SERPAPI_BASE = "https://serpapi.com/search.json";
const SHORTS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SHORTS_PER_FETCH = 24;

export type YouTubeShort = {
  id: string;
  title: string;
  link: string;
  thumbnail: string | null;
  views: string;
  channel: string | null;
  duration: string | null;
  publishedAt: string | null;
};

type CacheEntry = { data: unknown; expiresAt: number };
const shortsCache = new Map<string, CacheEntry>();

export { consumeRateLimit, isSerpKeyConfigured };

/** Validate a search query + optional result count. */
export function parseYoutubeQuery(
  rawQuery: string | null,
  rawNum: string | null
): { ok: true; q: string; num: number } | { ok: false; error: string } {
  const q = (rawQuery || "").trim();
  if (!q || q.length > 100) {
    return {
      ok: false,
      error: "A valid q query param is required (max 100 chars).",
    };
  }
  if (!/^[\p{L}\p{N}\s.,#'’\-&+()/@%!:=]+$/u.test(q)) {
    return { ok: false, error: "The search query contains unsupported characters." };
  }

  let num = 12;
  if (rawNum) {
    const parsed = Number.parseInt(rawNum, 10);
    if (Number.isFinite(parsed)) num = Math.min(Math.max(parsed, 1), 40);
  }

  return { ok: true, q, num };
}

/** Deterministic cache key for a shorts search (page token included). */
export function shortsCacheKey(
  userId: string,
  q: string,
  num: number,
  sp: string = ""
): string {
  return `${userId}::${q}::${num}::${sp}`;
}

/**
 * Validate a SerpApi `sp` page token. Tokens are opaque base64-ish strings;
 * we only bound their length and charset so garbage can't reach the upstream.
 */
export function parseYoutubePage(rawSp: string | null): string | null {
  const sp = (rawSp || "").trim();
  if (!sp || sp.length > 600) return null;
  if (!/^[A-Za-z0-9_%+\-/.:=]+$/.test(sp)) return null;
  return sp;
}

/** Return cached shorts payload for a cache key if still fresh. */
export function getCachedShorts(cacheKey: string): unknown | null {
  const entry = shortsCache.get(cacheKey);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  if (entry) shortsCache.delete(cacheKey);
  return null;
}

/** Store shorts payload bound to a cache key. */
export function setCachedShorts(cacheKey: string, data: unknown): void {
  shortsCache.set(cacheKey, { data, expiresAt: Date.now() + SHORTS_CACHE_TTL_MS });
}

function extractVideoId(link: unknown): string {
  const url = typeof link === "string" ? link : "";
  const short = url.match(/\/shorts\/([a-zA-Z0-9_-]{6,})/)?.[1];
  if (short) return short;
  return url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)?.[1] || "";
}

function formatViews(value: unknown): string {
  const num = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(num) || num <= 0) return "";
  try {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  } catch {
    return String(num);
  }
}

function isShortDuration(raw: unknown): boolean {
  const text = String(raw ?? "").trim();
  return /^\d+:\d{2}$/.test(text) && Number.parseInt(text.split(":")[0], 10) <= 1;
}

/**
 * Normalize SerpApi youtube results into YouTubeShort[]. Prefers the dedicated
 * `shorts_results` shelf; enriches channel/duration/published from
 * `video_results` when video ids overlap (those fields are "when available").
 * Falls back to filtering `video_results` for /shorts/ links if no shelf.
 */
function normalizeShorts(rawShortsResults: unknown[], rawVideoResults: unknown[]): YouTubeShort[] {
  const byId = new Map<string, Record<string, unknown>>();
  for (const video of rawVideoResults || []) {
    const e = video as Record<string, unknown>;
    const id = typeof e.video_id === "string" ? e.video_id : "";
    if (id) byId.set(id, e);
  }

  const seen = new Set<string>();
  const out: YouTubeShort[] = [];

  const push = (item: Record<string, unknown>) => {
    const link = typeof item.link === "string" && item.link.startsWith("http") ? item.link : "";
    const id =
      typeof item.video_id === "string" && item.video_id ? item.video_id : extractVideoId(link);
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!id || !title || seen.has(id)) return;
    seen.add(id);

    const enrich =
      byId.get(id) ??
      (typeof item.channel === "object" && item.channel
        ? (item.channel as Record<string, unknown>)
        : undefined) ??
      {};

    const channel =
      typeof enrich.name === "string" && enrich.name
        ? enrich.name
        : typeof item.channel === "string"
          ? item.channel
          : null;

    out.push({
      id,
      title,
      link: link || `https://www.youtube.com/shorts/${id}`,
      thumbnail:
        typeof item.thumbnail === "string" && item.thumbnail
          ? item.thumbnail
          : item.thumbnail && typeof item.thumbnail === "object"
            ? ((item.thumbnail as { static?: unknown }).static as string) ?? null
            : null,
      views:
        typeof item.views_original === "string"
          ? item.views_original
          : formatViews(item.views),
      channel,
      duration: typeof enrich.length === "string" ? enrich.length : null,
      publishedAt:
        typeof enrich.published_date === "string" ? enrich.published_date : null,
    });
  };

  for (const node of rawShortsResults || []) {
    const shorts = (node as Record<string, unknown>).shorts;
    if (!Array.isArray(shorts)) continue;
    for (const item of shorts) {
      push(item as Record<string, unknown>);
      if (out.length >= MAX_SHORTS_PER_FETCH) break;
    }
    if (out.length >= MAX_SHORTS_PER_FETCH) break;
  }

  if (out.length === 0) {
    for (const video of rawVideoResults || []) {
      const e = video as Record<string, unknown>;
      const link = typeof e.link === "string" ? e.link : "";
      if (!link.includes("/shorts/") && !isShortDuration(e.length)) continue;
      push(e);
      if (out.length >= MAX_SHORTS_PER_FETCH) break;
    }
  }

  return out;
}

export type FetchShortsResult = {
  shorts: YouTubeShort[];
  nextPageToken: string | null;
};

/** Query SerpApi's youtube engine for Shorts-style results. */
export async function fetchYouTubeShorts(
  q: string,
  num: number,
  opts: { sp?: string | null; noCache?: boolean } = {}
): Promise<FetchShortsResult> {
  const search = new URLSearchParams({
    engine: "youtube",
    search_query: q,
    num: String(num),
    hl: "en",
    gl: "in",
    google_domain: "google.co.in",
    api_key: process.env.SERPAPI_KEY || process.env.SERP_API_KEY || "",
  });
  if (opts.sp) search.set("sp", opts.sp);
  if (opts.noCache) search.set("no_cache", "1");

  const res = await fetchWithTimeout(`${SERPAPI_BASE}?${search.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string }).error || `YouTube search failed (${res.status})`;
    throw new Error(message);
  }

  const shortsResults = Array.isArray((data as { shorts_results?: unknown[] }).shorts_results)
    ? (data as { shorts_results: unknown[] }).shorts_results
    : [];
  const videoResults = Array.isArray((data as { video_results?: unknown[] }).video_results)
    ? (data as { video_results: unknown[] }).video_results
    : [];

  const nextPageToken =
    (data as { serpapi_pagination?: { next_page_token?: unknown } }).serpapi_pagination
      ?.next_page_token ?? null;
  const nextPageTokenStr =
    typeof nextPageToken === "string" && nextPageToken ? nextPageToken : null;

  return {
    shorts: normalizeShorts(shortsResults, videoResults),
    nextPageToken: nextPageTokenStr ? parseYoutubePage(nextPageTokenStr) : null,
  };
}